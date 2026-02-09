// src/features/auth/hooks/useForgotPassword.ts
import { useCallback, useEffect, useRef, useState } from "react";

import { sendVerifyCode, forgetPassword } from "../api";
import type { ForgetPasswordPayload, OperationResult } from "../types";

/**
 * useForgotPassword（方案 B）
 *
 * 职责：
 * - 编排“忘记密码”两步流程：
 *   1) 发送验证码：POST /user/send-verify-code
 *   2) 重置密码：POST /user/forget-password
 * - 管理状态：sendingCode / submitting / countdown
 *
 * 约定（方案 B）：
 * - API 层只负责 request<T>()
 * - Hook 只负责：状态编排 + 调接口 + 倒计时
 * - 不做：message 提示
 * - 不做：输入合法性校验（交给页面 Form rules）
 *
 * 失败：
 * - 直接抛 ApiError（由页面 catch 后统一 message）
 */

const COUNTDOWN_SECONDS = 60;

export function useForgotPassword() {
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 倒计时（>0 表示按钮禁用）
  const [countdown, setCountdown] = useState(0);

  // 用 ref 保存 timer，避免重复启动 & 组件卸载后 setState
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
    // 卸载时清理
    return () => stopTimer();
  }, [stopTimer]);

  /**
   * 发送验证码
   * - 成功：开启倒计时，返回 true
   * - 失败：抛 ApiError / Error（由页面处理提示）
   *
   * 注意：输入校验交给页面（Form rules）
   */
  const sendCode = useCallback(
    async (username: string) => {
      const u = (username ?? "").trim();

      // 倒计时中不重复发（静默返回 false，让页面决定是否提示）
      if (countdown > 0) return false;

      setSendingCode(true);
      try {
        await sendVerifyCode({ username: u });
        startCountdown(COUNTDOWN_SECONDS);
        return true;
      } finally {
        setSendingCode(false);
      }
    },
    [countdown, startCountdown],
  );

  /**
   * 重置密码
   * - 成功：返回服务端 OperationResult（通常是 string / null）
   * - 失败：抛 ApiError / Error（由页面处理提示）
   *
   * 注意：输入校验交给页面（Form rules）
   */
  const resetPassword = useCallback(async (payload: ForgetPasswordPayload) => {
    const username = (payload.username ?? "").trim();
    const verifyCode = (payload.verifyCode ?? "").trim();
    const newPassword = payload.newPassword ?? "";

    setSubmitting(true);
    try {
      const res = await forgetPassword({ username, verifyCode, newPassword });
      return res as OperationResult;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const resetCountdown = useCallback(() => {
    stopTimer();
    setCountdown(0);
  }, [stopTimer]);

  return {
    // 状态
    sendingCode,
    submitting,
    countdown, // 0 表示可发送；>0 表示还剩 xx 秒

    // 动作
    sendCode,
    resetPassword,

    // 工具（可选）
    resetCountdown,
  };
}
