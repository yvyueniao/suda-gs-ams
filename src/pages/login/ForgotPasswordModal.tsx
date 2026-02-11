// src/pages/login/ForgotPasswordModal.tsx
import { useEffect, useMemo } from "react";
import { Button, Form, Input, Modal, Typography, message } from "antd";

import { useAsyncAction } from "../../shared/actions";
import { useForgotPassword } from "../../features/auth/hooks/useForgotPassword";

type ForgotFormValues = {
  username: string;
  verifyCode: string;
  newPassword: string;
  newPassword2: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** 从登录框“带入”的账号（可为空） */
  initialUsername?: string;
};

export default function ForgotPasswordModal({
  open,
  onClose,
  initialUsername,
}: Props) {
  const [form] = Form.useForm<ForgotFormValues>();

  const { countdown, sendCode, resetPassword } = useForgotPassword();

  // 发送验证码 action（只管这个按钮的 loading + 提示）
  const sendAction = useAsyncAction<boolean>({
    successMessage: "验证码已发送（请查收邮箱/短信）",
    errorMessage: "发送失败，请稍后重试",
  });

  // 重置密码 action（对应 Modal OK）
  const resetAction = useAsyncAction<string | null>({
    errorMessage: "重置失败，请稍后重试",
    onError: (e: any) => {
      // 表单校验错误：不提示
      if (e?.errorFields) return true;
    },
    onSuccess: async (res) => {
      message.success(res || "密码已重置，请使用新密码登录");
      onClose();
    },
  });

  // 弹窗打开时：预填账号 + 清空其它字段
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      username: String(initialUsername ?? "").trim(),
      verifyCode: "",
      newPassword: "",
      newPassword2: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const usernameWatch = Form.useWatch("username", form);

  const canSendCode = useMemo(() => {
    const u = String(usernameWatch ?? "").trim();
    return /^\d{11}$/.test(u) && countdown <= 0;
  }, [usernameWatch, countdown]);

  const handleSendCode = () =>
    sendAction.run(async () => {
      const username = String(form.getFieldValue("username") ?? "").trim();
      if (!/^\d{11}$/.test(username)) {
        message.warning("账号必须为 11 位数字");
        return false;
      }

      const ok = await sendCode(username);
      // 倒计时中重复点：不提示、不报错
      return ok;
    });

  const handleResetPassword = () =>
    resetAction.run(async () => {
      const v = await form.validateFields();
      return resetPassword({
        username: v.username.trim(),
        verifyCode: v.verifyCode.trim(),
        newPassword: v.newPassword,
      });
    });

  return (
    <Modal
      title="忘记密码"
      open={open}
      onCancel={onClose}
      onOk={handleResetPassword}
      okText="重置密码"
      confirmLoading={resetAction.loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="账号"
          rules={[
            { required: true, message: "请输入账号" },
            { pattern: /^\d{11}$/, message: "账号必须为 11 位数字" },
          ]}
        >
          <Input placeholder="请输入 11 位账号" maxLength={11} />
        </Form.Item>

        <Form.Item
          name="verifyCode"
          label="验证码"
          rules={[
            { required: true, message: "请输入验证码" },
            { pattern: /^\d{6}$/, message: "验证码为 6 位数字" },
          ]}
        >
          <Input
            placeholder="请输入 6 位验证码"
            maxLength={6}
            addonAfter={
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={handleSendCode}
                disabled={!canSendCode || sendAction.loading}
                loading={sendAction.loading}
              >
                {countdown > 0 ? `${countdown}s 后重试` : "获取验证码"}
              </Button>
            }
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[{ required: true, message: "请输入新密码" }]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          name="newPassword2"
          label="确认新密码"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const p1 = getFieldValue("newPassword");
                if (!value || value === p1) return Promise.resolve();
                return Promise.reject(new Error("两次输入的新密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>

        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          说明：验证码有效期以服务端为准。
        </Typography.Paragraph>
      </Form>
    </Modal>
  );
}
