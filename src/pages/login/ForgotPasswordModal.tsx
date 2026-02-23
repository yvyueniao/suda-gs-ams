import { useEffect } from "react";
import { Button, Form, Input, Modal, Typography } from "antd";

import { useForgotPassword } from "../../features/auth/hooks/useForgotPassword";

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
  const {
    form,
    countdown,
    canSendCode,
    sendLoading,
    resetLoading,
    initWhenOpen,
    handleSendCode,
    handleResetPassword,
  } = useForgotPassword();

  // 弹窗打开时：预填账号 + 清空其它字段（由 hook 统一处理）
  useEffect(() => {
    initWhenOpen(open, initialUsername);
  }, [open, initialUsername, initWhenOpen]);

  return (
    <Modal
      title="忘记密码"
      open={open}
      onCancel={onClose}
      onOk={() => handleResetPassword(onClose)}
      okText="重置密码"
      confirmLoading={resetLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="账号"
          rules={[{ required: true, message: "请输入账号" }]}
        >
          <Input placeholder="请输入账号" maxLength={15} />
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
                disabled={!canSendCode || sendLoading}
                loading={sendLoading}
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
