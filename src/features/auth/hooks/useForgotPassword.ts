// src/features/auth/hooks/useForgotPassword.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../../../shared/http/error";
import { forgetPassword, sendVerifyCode } from "../api";
import type { ForgetPasswordPayload } from "../types";

/**
 * useForgotPassword
 *
 * 职责：
 * - 编排“忘记密码”两步流程：
 *   1) 发送验证码：POST /user/send-verify-code
 *   2) 重置密码：POST /user/forget-password
 * - 管理状态：sending / submitting / countdown
 *
 * 约定（和你项目风格对齐）：
 * - API 层只负责 request<T>()
 * - Hook 负责：try/catch + message + 状态编排
 * - 页面层只负责：表单 + 调用 hook
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

  const sendCode = useCallback(
    async (username: string) => {
      const u = (username ?? "").trim();

      if (!u) {
        message.warning("请输入账号");
        return false;
      }
      if (!/^\d{11}$/.test(u)) {
        message.warning("账号必须为 11 位数字");
        return false;
      }
      if (countdown > 0) {
        // 倒计时中不重复发
        return false;
      }

      setSendingCode(true);
      try {
        await sendVerifyCode({ username: u });
        message.success("验证码已发送");
        startCountdown(COUNTDOWN_SECONDS);
        return true;
      } catch (e: any) {
        if (e instanceof ApiError) {
          message.error(e.message);
          return false;
        }
        message.error("发送失败");
        return false;
      } finally {
        setSendingCode(false);
      }
    },
    [countdown, startCountdown],
  );

  const resetPassword = useCallback(async (payload: ForgetPasswordPayload) => {
    const username = (payload.username ?? "").trim();
    const verifyCode = (payload.verifyCode ?? "").trim();
    const newPassword = (payload.newPassword ?? "").trim();

    if (!/^\d{11}$/.test(username)) {
      message.warning("账号必须为 11 位数字");
      return null;
    }
    if (!verifyCode) {
      message.warning("请输入验证码");
      return null;
    }
    // 你后端示例是 6 位验证码；如果未来变动，这里也能放宽
    if (!/^\d{6}$/.test(verifyCode)) {
      message.warning("验证码格式不正确（应为 6 位数字）");
      return null;
    }
    if (!newPassword) {
      message.warning("请输入新密码");
      return null;
    }

    setSubmitting(true);
    try {
      const res = await forgetPassword({ username, verifyCode, newPassword });
      message.success(res || "密码重置成功");
      return res;
    } catch (e: any) {
      if (e instanceof ApiError) {
        message.error(e.message);
        return null;
      }
      message.error("重置失败");
      return null;
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
