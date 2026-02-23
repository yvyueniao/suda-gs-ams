// src/features/activity-apply/hooks/useApplyFlow.ts
/**
 * useApplyFlow
 *
 * 目标：
 * - 把“报名 -> 成功/失败弹窗 ->（失败弹窗里可候补）-> 候补成功/失败非侵入提示”
 *   这一整套流程，抽成一个独立 hook（页面层只负责渲染 Modal + message）。
 *
 * 约定：
 * - ✅ 不直接 import antd message / Modal（不做 UI）
 * - ✅ 只暴露状态与回调，让页面层决定怎么展示
 * - ✅ 候补入口只存在于“报名失败弹窗”
 *
 * ✅ 本次修复点（按你说的“弹窗出现但实际没执行”来兜底）：
 * 1) startRegister / startCancelWithNotify / startCandidateFromFailModal：
 *    - 统一 try/catch：避免 request 抛错时直接让页面“看起来没执行”
 *    - 失败时也能稳定写 modal.msg / notify
 * 2) 让 onNotify 也能接收 info（可用于“窗外禁用”的提示等）
 * 3) 对 enableCandidateInFailModal：state 初始化和 openRegisterFail 保持一致
 */

import { useCallback, useMemo, useRef, useState } from "react";

import { useApplyActions } from "./useApplyActions";
import type { ApplyActionResult } from "./useApplyActions";
import type { EnrollTableRow } from "../types";

export type ApplyFlowModalKind = "NONE" | "REGISTER_OK" | "REGISTER_FAIL";

export type ApplyFlowModalState = {
  kind: ApplyFlowModalKind;
  open: boolean;

  activityId: number | null;
  activityName?: string;

  /** 后端 msg 或错误文案 */
  msg: string;

  /** 报名失败弹窗里是否允许显示候补按钮（默认 true） */
  canCandidate: boolean;
};

export type UseApplyFlowOptions = {
  /** ✅ 可选：复用外部 actions（推荐：用 useEnrollTable 里那套） */
  applyActions?: ReturnType<typeof useApplyActions>;

  /** 任一动作成功后触发（例如：table.reload） */
  onChanged?: () => void | Promise<void>;

  /** 非侵入式提示（页面层用 message.success/error/info 实现） */
  onNotify?: (payload: {
    kind: "success" | "error" | "info";
    msg: string;
  }) => void;

  /** 报名失败后弹窗是否显示“候补”按钮（默认 true） */
  enableCandidateInFailModal?: boolean;

  /** 禁用 actions 内置错误 toast（推荐 true：由页面层统一控制） */
  muteActionErrorToast?: boolean;
};

export function useApplyFlow(options: UseApplyFlowOptions = {}) {
  const {
    applyActions: externalActions,
    onChanged,
    onNotify,
    enableCandidateInFailModal = true,
    muteActionErrorToast = true,
  } = options;

  // ✅ 优先复用外部 actions；否则自己创建
  const innerActions = useApplyActions({
    onChanged,
    muteActionErrorToast,
  });
  const applyActions = externalActions ?? innerActions;

  // ✅ 避免闭包拿到旧的 enableCandidateInFailModal（虽然你依赖数组写了，这里更稳）
  const enableCandidateRef = useRef(enableCandidateInFailModal);
  enableCandidateRef.current = enableCandidateInFailModal;

  const [modal, setModal] = useState<ApplyFlowModalState>({
    kind: "NONE",
    open: false,
    activityId: null,
    activityName: undefined,
    msg: "",
    canCandidate: enableCandidateInFailModal,
  });

  const closeModal = useCallback(() => {
    setModal((s) => ({
      ...s,
      open: false,
      kind: "NONE",
      activityId: null,
      activityName: undefined,
      msg: "",
      // ✅ 关闭时不强行改 canCandidate，避免“下一次打开”出现奇怪闪烁
      // canCandidate 由 openRegisterFail / openRegisterOk 决定
    }));
  }, []);

  const openRegisterOk = useCallback(
    (payload: { id: number; name?: string; msg: string }) => {
      setModal({
        kind: "REGISTER_OK",
        open: true,
        activityId: payload.id,
        activityName: payload.name,
        msg: payload.msg,
        canCandidate: false,
      });
    },
    [],
  );

  const openRegisterFail = useCallback(
    (payload: { id: number; name?: string; msg: string }) => {
      setModal({
        kind: "REGISTER_FAIL",
        open: true,
        activityId: payload.id,
        activityName: payload.name,
        msg: payload.msg,
        canCandidate: enableCandidateRef.current,
      });
    },
    [],
  );

  /**
   * ✅ 入口：点击“报名”按钮时调用
   * - 无论成功/失败都要弹窗（符合你的要求）
   *
   * ✅ 关键修复：try/catch
   * - 有些情况下 request 会 throw（网络错/401/后端非 200）
   * - 你如果不 catch，页面会“看起来点了但没执行”（其实是 Promise reject 了）
   */
  const startRegister = useCallback(
    async (
      row: Pick<EnrollTableRow, "id" | "name">,
    ): Promise<ApplyActionResult> => {
      try {
        const res = await applyActions.register(row.id);

        if (res.ok) {
          openRegisterOk({
            id: row.id,
            name: row.name,
            msg: res.msg || "报名成功",
          });
        } else {
          openRegisterFail({
            id: row.id,
            name: row.name,
            msg: res.msg || "报名失败",
          });
        }

        return res;
      } catch (e) {
        // ✅ 兜底：即使异常，也给失败弹窗（并把错误信息尽量展示出来）
        const msg =
          e instanceof Error
            ? e.message || "报名失败"
            : typeof e === "string"
              ? e
              : "报名失败";

        openRegisterFail({
          id: row.id,
          name: row.name,
          msg,
        });

        return { ok: false, kind: "REGISTER", activityId: row.id, msg };
      }
    },
    [applyActions, openRegisterFail, openRegisterOk],
  );

  /**
   * ✅ 失败弹窗里的“候补”按钮
   * 交互要求：
   * 1) 点击后先关闭弹窗
   * 2) 候补成功：非侵入提示 success
   * 3) 候补失败：非侵入提示 error + msg
   *
   * ✅ 修复：try/catch（同理，避免 promise reject 后“看起来没执行”）
   */
  const startCandidateFromFailModal = useCallback(async () => {
    const id = modal.activityId;
    if (!id) return;

    closeModal();

    try {
      const res = await applyActions.candidate(id);

      if (res.ok) {
        onNotify?.({ kind: "success", msg: res.msg || "候补成功" });
      } else {
        onNotify?.({ kind: "error", msg: res.msg || "候补失败" });
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message || "候补失败"
          : typeof e === "string"
            ? e
            : "候补失败";
      onNotify?.({ kind: "error", msg });
    }
  }, [applyActions, closeModal, modal.activityId, onNotify]);

  /**
   * ✅ 取消动作（取消报名/取消候补/取消审核）
   * - 二次确认在页面层/ActionCell 处理
   * - 这里负责：执行取消 + 最终成功/失败提示（toast）
   *
   * ✅ 修复：try/catch（避免异常时没有最终提示）
   */
  const startCancelWithNotify = useCallback(
    async (activityId: number): Promise<ApplyActionResult> => {
      try {
        const res = await applyActions.cancel(activityId);

        if (res.ok) {
          onNotify?.({ kind: "success", msg: res.msg || "取消成功" });
        } else {
          onNotify?.({ kind: "error", msg: res.msg || "取消失败" });
        }

        return res;
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message || "取消失败"
            : typeof e === "string"
              ? e
              : "取消失败";

        onNotify?.({ kind: "error", msg });

        return { ok: false, kind: "CANCEL", activityId, msg };
      }
    },
    [applyActions, onNotify],
  );

  const isLoading = useCallback(
    (activityId: number) => applyActions.rowAction.isLoading(activityId),
    [applyActions],
  );

  const modalView = useMemo(() => {
    return {
      open: modal.open,
      kind: modal.kind,
      title:
        modal.kind === "REGISTER_OK"
          ? "报名成功"
          : modal.kind === "REGISTER_FAIL"
            ? "报名失败"
            : "",
      msg: modal.msg,
      activityId: modal.activityId,
      activityName: modal.activityName,
      canCandidate: modal.kind === "REGISTER_FAIL" && modal.canCandidate,
      candidateLoading: modal.activityId ? isLoading(modal.activityId) : false,
    };
  }, [isLoading, modal]);

  return {
    // ✅ 暴露 actions（给取消等继续用）
    applyActions,

    // ✅ 报名入口（列表按钮/详情按钮调用这个）
    startRegister,

    // ✅ 取消入口（列表/详情页确认后调用这个，自动 toast）
    startCancelWithNotify,

    // ✅ 弹窗状态与事件
    modal: modalView,
    closeModal,
    startCandidateFromFailModal,
  };
}
