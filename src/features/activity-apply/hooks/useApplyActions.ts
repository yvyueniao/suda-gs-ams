// src/features/activity-apply/hooks/useApplyActions.ts

/**
 * useApplyActions
 *
 * 职责：
 * - 聚合“报名 / 候补 / 取消”三个行内动作
 * - 统一行级 loading（useAsyncMapAction）
 * - 不做 UI：不弹窗、不 message/toast
 *
 * 说明：
 * - actions 层（useAsyncMapAction）默认会做错误提示
 * - 你如果希望“报名失败弹窗完全由页面层控制”，可以在这里 onError return true 禁止默认 toast
 */

import { useCallback, useMemo, useRef } from "react";

import { useAsyncMapAction } from "../../../shared/actions";
import { ApiError } from "../../../shared/http/error";

import { registerActivity, candidateActivity, cancelActivity } from "../api";

export type ApplyActionKind = "REGISTER" | "CANDIDATE" | "CANCEL";

export type ApplyActionResult = {
  ok: boolean;
  kind: ApplyActionKind;
  activityId: number;
  /** 后端 msg 或捕获到的错误文案 */
  msg: string;
  /** 成功时：接口返回的 data（多数是 string） */
  data?: unknown;
};

function errToMsg(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export type UseApplyActionsOptions = {
  /** 任一动作成功后触发（例如：table.reload / detail.reload） */
  onChanged?: () => void | Promise<void>;

  /**
   * 是否禁用 actions 内置的错误 toast
   * - 你要“统一报名失败弹窗”时建议设为 true
   */
  muteActionErrorToast?: boolean;
};

export function useApplyActions(options: UseApplyActionsOptions = {}) {
  const { onChanged, muteActionErrorToast = true } = options;

  /**
   * actions 的 run(key, fn) 在失败时通常返回 undefined，
   * 我们需要把错误文案带回页面层，因此用 ref 暂存最近一次错误。
   */
  const lastErrorRef = useRef<{ key: number; msg: string } | null>(null);

  // ✅ 让 rowAction 引用稳定：避免每次 render 都重新创建
  const rowAction = useMemo(
    () =>
      useAsyncMapAction<number, unknown>({
        onSuccess: async () => {
          await Promise.resolve(onChanged?.());
        },
        onError: (err) => {
          const msg = errToMsg(err, "操作失败");
          // 这里的 key 在 wrapRun 里会先写入本次 activityId
          if (lastErrorRef.current) lastErrorRef.current.msg = msg;
          else lastErrorRef.current = { key: -1, msg };

          // return true => 阻止 actions 默认 toast（由页面层弹窗统一处理）
          return muteActionErrorToast;
        },
      }),
    [onChanged, muteActionErrorToast],
  );

  const wrapRun = useCallback(
    async (
      kind: ApplyActionKind,
      activityId: number,
      fn: () => Promise<unknown>,
      fallbackOkMsg: string,
      fallbackFailMsg: string,
    ): Promise<ApplyActionResult> => {
      lastErrorRef.current = { key: activityId, msg: fallbackFailMsg };

      const data = await rowAction.run(activityId, fn);

      if (data !== undefined) {
        return {
          ok: true,
          kind,
          activityId,
          // ✅ 成功文案保持稳定（不要把 data stringify 成 msg）
          msg: fallbackOkMsg,
          data,
        };
      }

      // 失败：从 lastErrorRef 里取（onError 已覆盖 msg）
      const msg =
        lastErrorRef.current?.key === activityId
          ? lastErrorRef.current.msg
          : fallbackFailMsg;

      return {
        ok: false,
        kind,
        activityId,
        msg,
      };
    },
    [rowAction],
  );

  /** 报名 */
  const register = useCallback(
    async (activityId: number) =>
      wrapRun(
        "REGISTER",
        activityId,
        () => registerActivity({ id: activityId }),
        "报名成功",
        "报名失败",
      ),
    [wrapRun],
  );

  /** 候补 */
  const candidate = useCallback(
    async (activityId: number) =>
      wrapRun(
        "CANDIDATE",
        activityId,
        () => candidateActivity({ id: activityId }),
        "候补成功",
        "候补失败",
      ),
    [wrapRun],
  );

  /** 取消（取消报名 / 取消候补 / 取消审核） */
  const cancel = useCallback(
    async (activityId: number) =>
      wrapRun(
        "CANCEL",
        activityId,
        () => cancelActivity({ id: activityId }),
        "取消成功",
        "取消失败",
      ),
    [wrapRun],
  );

  return {
    rowAction,
    register,
    candidate,
    cancel,
  };
}
