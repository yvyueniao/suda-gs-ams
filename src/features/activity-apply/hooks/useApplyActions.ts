import { useCallback, useEffect, useRef } from "react";
import { useAsyncMapAction } from "../../../shared/actions";
import { ApiError } from "../../../shared/http/error";

import { registerActivity, candidateActivity, cancelActivity } from "../api";

export type ApplyActionKind = "REGISTER" | "CANDIDATE" | "CANCEL";

export type ApplyActionResult = {
  ok: boolean;
  kind: ApplyActionKind;
  activityId: number;
  msg: string;
  data?: unknown;
};

function errToMsg(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}

export type UseApplyActionsOptions = {
  onChanged?: () => void | Promise<void>;
  muteActionErrorToast?: boolean;
};

export function useApplyActions(options: UseApplyActionsOptions = {}) {
  const { onChanged, muteActionErrorToast = true } = options;

  // ✅ 存最近一次错误 msg（优先写入后端 msg）
  const lastErrorMsgRef = useRef<string>("");

  // ✅ 避免闭包拿到旧的 onChanged
  const onChangedRef = useRef<UseApplyActionsOptions["onChanged"]>(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  /**
   * ✅ 关键：Hook 必须顶层调用，不能放 useMemo 里！
   */
  const rowAction = useAsyncMapAction<number, unknown>({
    onSuccess: async () => {
      await Promise.resolve(onChangedRef.current?.());
    },
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.log("[applyActions] onError err =", err);

      // 注意：这里 err 可能是 undefined（你已经看到过）
      // 所以不要用它覆盖 lastErrorMsgRef；真正的 msg 在 wrapRun.safeFn 里捕获并写入
      return muteActionErrorToast;
    },
  });

  const wrapRun = useCallback(
    async (
      kind: ApplyActionKind,
      activityId: number,
      fn: () => Promise<unknown>,
      fallbackOkMsg: string,
      fallbackFailMsg: string,
    ): Promise<ApplyActionResult> => {
      // 先写兜底失败文案
      lastErrorMsgRef.current = fallbackFailMsg;

      // ✅ 在这里抓住真实错误（ApiError.message 就是后端 msg）
      const safeFn = async () => {
        try {
          return await fn();
        } catch (e) {
          const msg = errToMsg(e, fallbackFailMsg);
          lastErrorMsgRef.current = msg;

          // eslint-disable-next-line no-console
          console.log("[applyActions] caught error msg =", msg, "raw =", e);

          throw e; // 继续抛给 useAsyncMapAction 收尾 loading
        }
      };

      const data = await rowAction.run(activityId, safeFn);

      if (data !== undefined) {
        return { ok: true, kind, activityId, msg: fallbackOkMsg, data };
      }

      return {
        ok: false,
        kind,
        activityId,
        msg: lastErrorMsgRef.current || fallbackFailMsg,
      };
    },
    [rowAction],
  );

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
