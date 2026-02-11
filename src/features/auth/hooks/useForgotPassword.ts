// src/features/auth/hooks/useForgotPassword.ts
import { useCallback, useEffect, useRef, useState } from "react";

import { sendVerifyCode, forgetPassword } from "../api";
import type { ForgetPasswordPayload, OperationResult } from "../types";

/**
 * useForgotPassword
 *
 * 职责（升级后）：
 * - 只编排“倒计时”规则（countdown）
 * - 提供两步动作：sendCode / resetPassword（不维护 loading、不 message）
 *
 * loading / 错误提示 / 成功提示：
 * - 统一交给 shared/actions/useAsyncAction
 */

const COUNTDOWN_SECONDS = 60;

export function useForgotPassword() {
  // 倒计时（>0 表示按钮禁用）
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (sec: number) => {
      stopTimer();
      setCountdown(sec);

      timerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  /**
   * 发送验证码
   * - 倒计时中：返回 false（不抛错，让页面决定是否提示）
   * - 成功：开启倒计时，返回 true
   * - 失败：抛 ApiError（由 useAsyncAction 统一提示）
   */
  const sendCode = useCallback(
    async (username: string) => {
      const u = (username ?? "").trim();
      if (countdown > 0) return false;

      await sendVerifyCode({ username: u });
      startCountdown(COUNTDOWN_SECONDS);
      return true;
    },
    [countdown, startCountdown],
  );

  /**
   * 重置密码
   * - 成功：返回服务端 OperationResult（string / null）
   * - 失败：抛 ApiError（由 useAsyncAction 统一提示）
   */
  const resetPassword = useCallback(async (payload: ForgetPasswordPayload) => {
    const username = (payload.username ?? "").trim();
    const verifyCode = (payload.verifyCode ?? "").trim();
    const newPassword = payload.newPassword ?? "";

    const res = await forgetPassword({ username, verifyCode, newPassword });
    return res as OperationResult;
  }, []);

  const resetCountdown = useCallback(() => {
    stopTimer();
    setCountdown(0);
  }, [stopTimer]);

  return {
    countdown,
    sendCode,
    resetPassword,
    resetCountdown,
  };
}
