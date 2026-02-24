import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormInstance } from "antd";
import { Form, message } from "antd";

import { useAsyncAction } from "../../../shared/actions";
import { sendVerifyCode, forgetPassword } from "../api";
import type { ForgetPasswordPayload, OperationResult } from "../types";
import { track } from "../../../shared/telemetry/track";
import { ApiError } from "../../../shared/http/error";

type ForgotFormValues = {
  username: string;
  verifyCode: string;
  newPassword: string;
  newPassword2: string;
};

const COUNTDOWN_SECONDS = 60;

/**
 * useForgotPassword（UI Hook）
 *
 * ✅ 目标：把 ForgotPasswordModal 里的所有业务编排都收进来
 * - 表单实例 form
 * - 打开弹窗时初始化
 * - 发送验证码：校验账号/倒计时/按钮状态/提示/loading
 * - 重置密码：表单校验/调用接口/提示/成功回调/loading
 *
 * ❌ 不改 shared 层
 * ❌ 不在这里做 invalid 判断（你说靠后端）
 */
export function useForgotPassword() {
  const [form] = Form.useForm<ForgotFormValues>();

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

  useEffect(() => stopTimer, [stopTimer]);

  // 监听账号
  const usernameWatch = Form.useWatch("username", form);

  // 你现在的规则：11 位数字才允许点“获取验证码”
  const canSendCode = useMemo(() => {
    const u = String(usernameWatch ?? "").trim();
    return /^\d{11}$/.test(u) && countdown <= 0;
  }, [usernameWatch, countdown]);

  /**
   * 弹窗打开时初始化表单
   */
  const initWhenOpen = useCallback(
    (open: boolean, initialUsername?: string) => {
      if (!open) return;

      const u = String(initialUsername ?? "").trim();

      form.setFieldsValue({
        username: u,
        verifyCode: "",
        newPassword: "",
        newPassword2: "",
      });

      // ✅ UI 行为埋点：打开忘记密码（不记录账号明文）
      track({
        event: "forgot_open",
        data: {
          initial_username_len: u.length,
        },
      });
    },
    [form],
  );

  /**
   * 发送验证码 action
   * - 成功提示：固定文案即可（后端此接口 data 是 null）
   * - 失败提示：优先吃后端 msg（由 request->ApiError.message 兜底）
   */
  const sendAction = useAsyncAction<boolean>({
    successMessage: "验证码已发送（请注意查收邮箱信息）",
    errorMessage: "发送失败，请稍后重试",
  });

  const handleSendCode = useCallback(() => {
    return sendAction.run(async () => {
      const startedAt = Date.now();
      const username = String(form.getFieldValue("username") ?? "").trim();

      // 倒计时中重复点：不提示、不报错
      if (countdown > 0) return false;

      // ✅ 触发行为（可选）：点击发送验证码
      track({
        event: "forgot_send_code_click",
        data: { username_len: username.length },
      });

      try {
        await sendVerifyCode({ username });
        startCountdown(COUNTDOWN_SECONDS);

        // ✅ 业务级埋点：发送验证码成功
        track({
          event: "forgot_send_code_success",
          data: {
            username_len: username.length,
            cost_ms: Date.now() - startedAt,
          },
        });

        return true;
      } catch (e: any) {
        const apiErr = e instanceof ApiError ? e : null;

        // ✅ 业务级埋点：发送验证码失败（值得作为事件）
        track({
          event: "forgot_send_code_fail",
          level: "warning",
          asEvent: true,
          data: {
            username_len: username.length,
            code: apiErr?.code,
            status: apiErr?.status,
            biz_code: apiErr?.bizCode,
            cost_ms: Date.now() - startedAt,
          },
        });

        throw e;
      }
    });
  }, [sendAction, form, countdown, startCountdown]);

  /**
   * 重置密码 action
   * - 成功提示：优先用后端返回 data（string），没有就用默认文案
   * - 失败提示：优先吃后端 msg（由 request->ApiError.message）
   */
  const resetAction = useAsyncAction<OperationResult>({
    errorMessage: "重置失败，请稍后重试",
    onError: (e: any) => {
      // 表单校验错误：不提示
      if (e?.errorFields) return true;
    },
  });

  const handleResetPassword = useCallback(
    async (onSuccess?: () => void) => {
      return resetAction.run(async () => {
        const startedAt = Date.now();
        const v = await form.validateFields();

        const payload: ForgetPasswordPayload = {
          username: v.username.trim(),
          verifyCode: v.verifyCode.trim(),
          newPassword: v.newPassword,
        };

        // ✅ 触发行为（可选）：点击重置
        track({
          event: "forgot_reset_click",
          data: { username_len: payload.username.length },
        });

        try {
          const res = await forgetPassword(payload);

          // ✅ 成功提示：优先后端 data（字符串）
          message.success(res || "密码已重置，请使用新密码登录");

          // ✅ 业务级埋点：重置成功
          track({
            event: "forgot_reset_success",
            data: {
              username_len: payload.username.length,
              cost_ms: Date.now() - startedAt,
            },
          });

          // 关闭弹窗等交给调用方
          onSuccess?.();

          return res as OperationResult;
        } catch (e: any) {
          const apiErr = e instanceof ApiError ? e : null;

          // ✅ 业务级埋点：重置失败（很关键，建议作为事件）
          track({
            event: "forgot_reset_fail",
            level: "warning",
            asEvent: true,
            data: {
              username_len: payload.username.length,
              code: apiErr?.code,
              status: apiErr?.status,
              biz_code: apiErr?.bizCode,
              cost_ms: Date.now() - startedAt,
            },
          });

          throw e;
        }
      });
    },
    [resetAction, form],
  );

  const resetCountdown = useCallback(() => {
    stopTimer();
    setCountdown(0);
  }, [stopTimer]);

  return {
    // form
    form: form as FormInstance<ForgotFormValues>,

    // countdown & ui state
    countdown,
    canSendCode,

    // loading
    sendLoading: sendAction.loading,
    resetLoading: resetAction.loading,

    // init
    initWhenOpen,

    // handlers
    handleSendCode,
    handleResetPassword,

    // misc
    resetCountdown,
  };
}
