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
  }, []);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  // ======================================================
  // 1) ✅ 共用搜索：姓名/学号任意输入 -> options
  // - 走 /user/pages 使用 key 进行模糊查询（后端支持 name/username）
  // - 仅保留最后一次请求结果（防竞态）
  // - ✅ 只负责“拉候选 + 维护 optionsList”，不直接改 value（value 的互斥清空在 onNameInput/onUsernameInput 里做）
  // ======================================================
  const searchCandidates = useCallback(
    async (keyword: string) => {
      const key = normalizeText(keyword);

      if (!key) {
        setOptionsList([]);
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

        if (reqId !== lastReqIdRef.current) return;

        const mapped: UserNameOption[] = (list ?? [])
          .map((u) => ({
            username: normalizeText((u as any).username),
            name: normalizeText((u as any).name),
          }))
          .filter((x) => x.username && x.name);

        setOptionsList(mapped);
      } catch (err: any) {
        if (reqId !== lastReqIdRef.current) return;
        setOptionsList([]);
        notify({ kind: "error", msg: err?.message ?? "用户搜索失败" });
      } finally {
        if (reqId === lastReqIdRef.current) setSearching(false);
      }
    },
    [notify],
  );

  // ======================================================
  // 2) ✅ 双输入（互斥防护）
  // - 改姓名：若已选中的 username 存在且姓名发生变化 -> 清空 username
  // - 改学号：若已选中的 name 存在且学号发生变化 -> 清空 name
  // - 两者都调用同一套 searchCandidates（共用候选）
  // ======================================================
  const onNameInput = useCallback(
    async (nameText: string) => {
      const nextName = nameText;
      const nextKey = normalizeText(nameText);

      setValue((s) => {
        const prevName = normalizeText(s.name);
        // ✅ 如果用户手动改了姓名（且之前已有学号），为了不出现不一致，清空学号
        const shouldClearUsername = !!s.username && nextKey !== prevName;
        return {
          ...s,
          name: nextName,
          username: shouldClearUsername ? "" : s.username,
        };
      });

      if (!nextKey) {
        setOptionsList([]);
        // 清空姓名时，学号也清空（避免残留）
        setValue((s) => ({ ...s, username: "" }));
        return;
      }

      await searchCandidates(nextKey);
    },
    [searchCandidates],
  );

  const onUsernameInput = useCallback(
    async (usernameText: string) => {
      const nextUsername = usernameText;
      const nextKey = normalizeText(usernameText);

      setValue((s) => {
        const prevUsername = normalizeText(s.username);
        // ✅ 如果用户手动改了学号（且之前已有姓名），为了不出现不一致，清空姓名
        const shouldClearName = !!s.name && nextKey !== prevUsername;
        return {
          ...s,
          username: nextUsername,
          name: shouldClearName ? "" : s.name,
        };
      });

      if (!nextKey) {
        setOptionsList([]);
        // 清空学号时，姓名也清空（避免残留）
        setValue((s) => ({ ...s, name: "" }));
        return;
      }

      await searchCandidates(nextKey);
    },
    [searchCandidates],
  );

  // ======================================================
  // 3) ✅ 选择某个候选 -> 同时回填 name + username（双向一致）
  // ======================================================
  const onPickUser = useCallback((opt: UserNameOption) => {
    setValue((s) => ({
      ...s,
      name: opt.name,
      username: opt.username,
    }));
  }, []);

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
    // 让正在飞的请求失效
    lastReqIdRef.current += 1;
  }, []);

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

    // ✅ 前置校验
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

      notify({
        kind: "success",
        msg: String(serverMsg ?? "").trim(),
      });

      try {
        await options?.onAfterSubmit?.();
      } catch {
        // ignore
      }

      closeModal();
    } catch (err: any) {
      notify({ kind: "error", msg: err?.message ?? "录入失败" });
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
