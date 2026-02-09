// src/pages/login/ForgotPasswordModal.tsx
import { useEffect, useMemo } from "react";
import { Button, Form, Input, Modal, Typography, message } from "antd";

import { useForgotPassword } from "../../features/auth/hooks/useForgotPassword";
import { ApiError } from "../../shared/http/error";

type ForgotFormValues = {
  username: string;
  verifyCode: string;
  newPassword: string;
  newPassword2: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * 从登录框“带入”的账号（可为空）
   */
  initialUsername?: string;
};

export default function ForgotPasswordModal({
  open,
  onClose,
  initialUsername,
}: Props) {
  const [form] = Form.useForm<ForgotFormValues>();

  const { sendingCode, submitting, countdown, sendCode, resetPassword } =
    useForgotPassword();

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

  const handleSendCode = async () => {
    try {
      const username = String(form.getFieldValue("username") ?? "").trim();
      if (!/^\d{11}$/.test(username)) {
        message.warning("账号必须为 11 位数字");
        return;
      }

      const ok = await sendCode(username);
      if (ok) message.success("验证码已发送（请查收邮箱/短信）");
    } catch (e: unknown) {
      if (e instanceof ApiError) message.error(e.message);
      else message.error("发送失败，请稍后重试");
    }
  };

  const handleResetPassword = async () => {
    try {
      const v = await form.validateFields();

      const res = await resetPassword({
        username: v.username.trim(),
        verifyCode: v.verifyCode.trim(),
        newPassword: v.newPassword,
      });

      message.success(res || "密码已重置，请使用新密码登录");
      onClose();
    } catch (e: any) {
      // 表单校验错误：不提示
      if (e?.errorFields) return;

      if (e instanceof ApiError) message.error(e.message);
      else message.error("重置失败，请稍后重试");
    }
  };

  return (
    <Modal
      title="忘记密码"
      open={open}
      onCancel={onClose}
      onOk={handleResetPassword}
      okText="重置密码"
      confirmLoading={submitting}
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
                disabled={!canSendCode || sendingCode}
                loading={sendingCode}
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
