/** src/features/rbac/user/hooks/useUserSpecialScore.ts
 * ======================================
 * useUserSpecialScore
 * ======================================
 *
 * ✅ 职责（features 层业务编排）：
 * - 打开/关闭“录入加分”弹窗（open 状态）
 * - 姓名输入 -> 走 /user/pages 做模糊查询（key=nameText），生成 AutoComplete 选项
 * - 用户选择姓名后 -> 自动回填学号（username）
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
  /** 姓名输入框文本（AutoComplete 的 value） */
  name: string;
  /** 选择后回填的学号（第二列） */
  username: string;
  /** 加分类型（第三列） */
  type: SpecialScoreType;
  /** 加分分数/次数（第四列） */
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
  // 1) 姓名模糊搜索 -> options
  // - 走 /user/pages 使用 key 进行模糊查询（后端通常支持 name/username）
  // - 仅保留最后一次请求结果（防竞态）
  // ======================================================
  const onNameInput = useCallback(
    async (nameText: string) => {
      const key = normalizeText(nameText);

      // 输入变化：先更新 name；如果用户改了名字，学号要清空（避免错配）
      setValue((s) => {
        const oldName = normalizeText(s.name);
        const nextName = nameText;
        const shouldClearUsername = s.username && key !== oldName;
        return {
          ...s,
          name: nextName,
          username: shouldClearUsername ? "" : s.username,
        };
      });

      if (!key) {
        setOptionsList([]);
        setValue((s) => ({ ...s, username: "" }));
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

        // 仅处理最后一次请求
        if (reqId !== lastReqIdRef.current) return;

        const mapped: UserNameOption[] = (list ?? [])
          .map((u) => ({
            username: normalizeText(u.username),
            name: normalizeText(u.name),
          }))
          .filter((x) => x.username && x.name);

        setOptionsList(mapped);
      } catch (err: any) {
        if (reqId !== lastReqIdRef.current) return;
        setOptionsList([]);

        // ✅ 失败提示：尽量使用后端 msg（ApiError.message），没有再兜底
        notify({ kind: "error", msg: err?.message ?? "姓名搜索失败" });
      } finally {
        if (reqId === lastReqIdRef.current) setSearching(false);
      }
    },
    [notify],
  );

  // ======================================================
  // 2) 选择某个候选 -> 自动回填学号
  // ======================================================
  const onPickUser = useCallback((opt: UserNameOption) => {
    setValue((s) => ({
      ...s,
      name: opt.name,
      username: opt.username,
    }));
  }, []);

  // ======================================================
  // 3) 选择加分类型 / 输入分数
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
  // 4) 提交到 /activity/special
  // ======================================================
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;

    const name = normalizeText(value.name);
    const username = normalizeText(value.username);
    const score = value.score;

    // ✅ 前置校验（这些提示属于前端交互，不依赖后端）
    if (!name) {
      notify({ kind: "info", msg: "请输入姓名" });
      return;
    }
    if (!username) {
      notify({ kind: "info", msg: "请从匹配列表中选择用户（需要回填学号）" });
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
      /**
       * ✅ 关键修复：
       * specialAddScore 调用 request()，成功时返回的是后端 data（通常 string）
       * code!=200 已经在 http 层抛 ApiError 了，所以这里不需要判断 res.code/res.msg
       */
      const serverMsg = await specialAddScore(payload); // string | unknown

      notify({
        kind: "success",
        msg: String(serverMsg ?? "").trim(),
      });

      // ✅ 成功后回调（例如 table.reload）
      try {
        await options?.onAfterSubmit?.();
      } catch {
        // 不影响主流程
      }

      closeModal();
    } catch (err: any) {
      // ✅ 失败提示：优先使用后端 msg（ApiError.message）
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

    onNameInput,
    onPickUser,
    onTypeChange,
    onScoreChange,

    // submit
    submitting,
    submit,
  };
}
