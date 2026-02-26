/** src/features/rbac/user/hooks/useUserSpecialScore.ts
 * ======================================
 * useUserSpecialScore
 * ======================================
 *
 * ✅ 职责（features 层业务编排）：
 * - 打开/关闭“录入加分”弹窗（open 状态）
 * - ✅ 姓名/学号 任意输入 -> 走 /user/pages 做模糊查询（key=keyword），生成下拉候选（共用一套）
 * - ✅ 选择任意候选 -> 同时回填 name + username（双向一致）
 * - ✅ 修改任意一方输入 -> 另一方清空（防止出现不一致）
 * - 选择加分类型 + 输入分数 -> 提交到 /activity/special
 *
 * ✅ 约定：
 * - 不在 hook 中直接使用 antd message（统一使用 Notify）
 * - 不吞错误：会 notify 并抛出错误，父层可以选择处理
 * - 尽量不影响原有用户管理逻辑（完全独立的新 hook）
 *
 * ✅ 重要说明（与你的 shared/http/request 对齐）：
 * - request<T>() 会“解壳”返回 data
 * - 响应拦截器会在 code !== 200 时直接 throw ApiError（err.message 就是后端 msg）
 * - 因此 specialAddScore 返回值是：后端的 data（通常是 string，如“成功添加1条记录”）
 * - 成功：try 不抛错；失败：catch 到 ApiError
 *
 * ✅ 本次关键优化（立刻减少通信量）：
 * - debounce：把“输入触发的高频请求”合并为最后一次
 * - 最小输入长度：避免 1 个字就打接口
 * - 缓存 TTL：短时间内重复 keyword 直接命中缓存，不再请求
 * - 去重：同一个 keyword 在短时间内重复触发（例如 AutoComplete 的 onSearch + onChange）只会请求一次
 */

import { useCallback, useMemo, useRef, useState } from "react";

import type { Notify } from "../../../../shared/ui";
import type {
  SpecialScorePayload,
  SpecialScoreType,
  UserNameOption,
} from "../types";
import { getUserPages, specialAddScore } from "../api";

/** ✅ 稳定的 noop，避免 callback 抖动 */
const noopNotify: Notify = () => {
  // noop
};

type FormValue = {
  /** 姓名输入框文本 */
  name: string;
  /** 学号输入框文本 */
  username: string;
  /** 加分类型 */
  type: SpecialScoreType;
  /** 加分分数/次数 */
  score: number | undefined;
};

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

/** ✅ 统一把错误转为“优先后端 msg”的可展示文案 */
function errToMsg(err: unknown, fallback: string) {
  const anyErr = err as any;
  const msg = typeof anyErr?.message === "string" ? anyErr.message.trim() : "";
  return msg || fallback;
}

/** ✅ 搜索配置：可按需要微调 */
const SEARCH_DEBOUNCE_MS = 1000;
const SEARCH_MIN_LEN = 1;
const SEARCH_CACHE_TTL_MS = 30_000; // 30s：足够降噪，又不至于太旧

type CacheValue = {
  ts: number;
  list: UserNameOption[];
};

export function useUserSpecialScore(options?: {
  onNotify?: Notify;
  /** ✅ 成功提交后给页面层一个回调（例如 table.reload） */
  onAfterSubmit?: () => void | Promise<void>;
}) {
  /** ✅ notify 必须稳定，否则 callback 会抖动 */
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // ======================================================
  // 0) Modal 开关
  // ======================================================
  const [open, setOpen] = useState(false);

  const [value, setValue] = useState<FormValue>({
    name: "",
    username: "",
    type: 0 as SpecialScoreType,
    score: undefined,
  });

  const [searching, setSearching] = useState(false);
  const [optionsList, setOptionsList] = useState<UserNameOption[]>([]);
  const lastReqIdRef = useRef(0);

  /** ✅ debounce timer + keyword 去重 */
  const debounceTimerRef = useRef<number | null>(null);
  const lastScheduledKeyRef = useRef<string>(""); // 最近一次“计划要搜”的 key
  const lastExecutedKeyRef = useRef<string>(""); // 最近一次“真正执行请求/读缓存”的 key

  /** ✅ TTL cache：key -> results */
  const cacheRef = useRef<Map<string, CacheValue>>(new Map());

  /** 清理 debounce */
  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /** 关闭时清空（避免残留） */
  const closeModal = useCallback(() => {
    setOpen(false);
    setValue({
      name: "",
      username: "",
      type: 0 as SpecialScoreType,
      score: undefined,
    });
    setOptionsList([]);
    setSearching(false);

    clearDebounce();

    // ✅ 让正在飞的请求失效（避免 close 后“回填候选”）
    lastReqIdRef.current += 1;

    // ✅ 重置去重 key（避免下次打开时“同 key 不触发”）
    lastScheduledKeyRef.current = "";
    lastExecutedKeyRef.current = "";
  }, [clearDebounce]);

  const openModal = useCallback(() => {
    // ✅ 只打开，不做任何加载/重置（符合你之前的要求）
    setOpen(true);
  }, []);

  // ======================================================
  // 1) ✅ 共用搜索：姓名/学号任意输入 -> options
  // - debounce + 最小输入长度 + TTL 缓存 + 去重
  // - 仅保留最后一次请求结果（防竞态）
  // - ✅ 只负责“拉候选 + 维护 optionsList”，不直接改 value
  // ======================================================
  const searchCandidates = useCallback(
    (keyword: string) => {
      const key = normalizeText(keyword);

      // 1) 清空：立即清 UI + 让飞行中请求失效
      if (!key) {
        clearDebounce();

        lastReqIdRef.current += 1;
        lastScheduledKeyRef.current = "";
        lastExecutedKeyRef.current = "";

        setOptionsList([]);
        setSearching(false);
        return;
      }

      // 2) 最小长度：不打接口（也不进入 searching）
      if (key.length < SEARCH_MIN_LEN) {
        clearDebounce();

        lastReqIdRef.current += 1; // 让飞行中请求失效（避免晚到覆盖）
        lastScheduledKeyRef.current = key;
        lastExecutedKeyRef.current = "";

        setOptionsList([]);
        setSearching(false);
        return;
      }

      // 3) 去重：同一个 key（例如 AutoComplete 的 onSearch+onChange）重复触发，直接忽略
      if (key === lastScheduledKeyRef.current) return;
      lastScheduledKeyRef.current = key;

      // 4) debounce：只保留最后一次
      clearDebounce();
      debounceTimerRef.current = window.setTimeout(async () => {
        // debounce 期间又输入了别的 key，就放弃本次
        if (lastScheduledKeyRef.current !== key) return;

        // 5) 执行层去重：同 key 不重复执行（避免某些边界情况）
        if (key === lastExecutedKeyRef.current) return;
        lastExecutedKeyRef.current = key;

        // 6) 先查缓存（TTL）
        const now = Date.now();
        const cached = cacheRef.current.get(key);
        if (cached && now - cached.ts <= SEARCH_CACHE_TTL_MS) {
          setOptionsList(cached.list);
          setSearching(false);
          return;
        }

        const reqId = ++lastReqIdRef.current;
        setSearching(true);

        try {
          const { list } = await getUserPages({
            pageNum: 1,
            pageSize: 20,
            key,
          });

          // ✅ 只接收最后一次请求
          if (reqId !== lastReqIdRef.current) return;

          const mapped: UserNameOption[] = (list ?? [])
            .map((u) => ({
              username: normalizeText((u as any).username),
              name: normalizeText((u as any).name),
            }))
            .filter((x) => x.username && x.name);

          // ✅ 写缓存（即使空数组也缓存，避免短时间反复打空请求）
          cacheRef.current.set(key, { ts: Date.now(), list: mapped });

          setOptionsList(mapped);
        } catch (err) {
          if (reqId !== lastReqIdRef.current) return;

          setOptionsList([]);
          notify({ kind: "error", msg: errToMsg(err, "用户搜索失败") });
        } finally {
          if (reqId === lastReqIdRef.current) setSearching(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [clearDebounce, notify],
  );

  // ======================================================
  // 2) ✅ 双输入（互斥防护）
  // - 两者都调用同一套 searchCandidates（共用候选）
  // ======================================================
  const onNameInput = useCallback(
    (nameText: string) => {
      const nextName = nameText;
      const nextKey = normalizeText(nameText);

      // ✅ 只 setValue 一次（避免“清空时 setValue 两次”的抖动）
      setValue((s) => {
        const prevName = normalizeText(s.name);
        const changed = nextKey !== prevName;

        return {
          ...s,
          name: nextName,
          // ✅ 如果用户手动改了姓名（且之前已有学号），为了不出现不一致，清空学号
          username: s.username && changed ? "" : s.username,
          // ✅ 如果姓名被清空，则学号也清空（避免残留）
          ...(nextKey ? null : { username: "" }),
        };
      });

      // ✅ 注意：这里不 await（保持输入流畅），debounce 会合并请求
      searchCandidates(nextKey);
    },
    [searchCandidates],
  );

  const onUsernameInput = useCallback(
    (usernameText: string) => {
      const nextUsername = usernameText;
      const nextKey = normalizeText(usernameText);

      setValue((s) => {
        const prevUsername = normalizeText(s.username);
        const changed = nextKey !== prevUsername;

        return {
          ...s,
          username: nextUsername,
          // ✅ 如果用户手动改了学号（且之前已有姓名），为了不出现不一致，清空姓名
          name: s.name && changed ? "" : s.name,
          // ✅ 如果学号被清空，则姓名也清空（避免残留）
          ...(nextKey ? null : { name: "" }),
        };
      });

      searchCandidates(nextKey);
    },
    [searchCandidates],
  );

  // ======================================================
  // 3) ✅ 选择某个候选 -> 同时回填 name + username（双向一致）
  // ======================================================
  const onPickUser = useCallback(
    (opt: UserNameOption) => {
      setValue((s) => ({
        ...s,
        name: opt.name,
        username: opt.username,
      }));

      // ✅ 选中后通常不需要继续展示候选（避免误选/视觉噪音）
      setOptionsList([]);
      setSearching(false);

      // ✅ 取消 debounce + 让飞行中的请求失效
      clearDebounce();
      lastReqIdRef.current += 1;
      lastScheduledKeyRef.current = "";
      lastExecutedKeyRef.current = "";
    },
    [clearDebounce],
  );

  // ======================================================
  // 4) ✅ 清空已选用户（两列一起清，候选也清）
  // ======================================================
  const clearPickedUser = useCallback(() => {
    setValue((s) => ({
      ...s,
      name: "",
      username: "",
    }));
    setOptionsList([]);
    setSearching(false);

    clearDebounce();

    // ✅ 让正在飞的请求失效
    lastReqIdRef.current += 1;
    lastScheduledKeyRef.current = "";
    lastExecutedKeyRef.current = "";
  }, [clearDebounce]);

  // ======================================================
  // 5) 选择加分类型 / 输入分数
  // ======================================================
  const onTypeChange = useCallback((type: SpecialScoreType) => {
    setValue((s) => ({ ...s, type }));
  }, []);

  const onScoreChange = useCallback((score: number | null) => {
    setValue((s) => ({
      ...s,
      score: typeof score === "number" ? score : undefined,
    }));
  }, []);

  // ======================================================
  // 6) 提交到 /activity/special
  // ======================================================
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;

    const name = normalizeText(value.name);
    const username = normalizeText(value.username);
    const score = value.score;

    // ✅ 前置校验（这是前端固定文案，不涉及后端 msg）
    if (!name) {
      notify({ kind: "info", msg: "请输入姓名或从下拉选择用户" });
      return;
    }
    if (!username) {
      notify({ kind: "info", msg: "请输入学号或从下拉选择用户" });
      return;
    }
    if (typeof score !== "number" || Number.isNaN(score)) {
      notify({ kind: "info", msg: "请输入加分分数/次数" });
      return;
    }
    if (score < 0) {
      notify({ kind: "info", msg: "加分分数/次数不能为负数" });
      return;
    }

    const payload: SpecialScorePayload = {
      username,
      type: value.type,
      score,
    };

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const serverMsg = await specialAddScore(payload);

      // ✅ 成功提示：优先用后端 data（通常是 string）
      const okMsg = String(serverMsg ?? "").trim() || "录入成功";
      notify({ kind: "success", msg: okMsg });

      try {
        await options?.onAfterSubmit?.();
      } catch {
        // ignore
      }

      closeModal();
    } catch (err) {
      // ✅ 失败提示：优先后端 msg（ApiError.message）
      notify({ kind: "error", msg: errToMsg(err, "录入失败") });
      throw err;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    closeModal,
    notify,
    options,
    value.name,
    value.score,
    value.type,
    value.username,
  ]);

  return {
    // modal
    open,
    openModal,
    closeModal,

    // SpecialScoreModal 所需的字段
    value,
    searching,
    options: optionsList,

    // ✅ 双输入（共用候选）
    onNameInput,
    onUsernameInput,

    // ✅ 选择/清空（双向一致）
    onPickUser,
    clearPickedUser,

    // type/score
    onTypeChange,
    onScoreChange,

    // submit
    submitting,
    submit,
  };
}
