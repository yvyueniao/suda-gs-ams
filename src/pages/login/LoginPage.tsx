// src/pages/login/LoginPage.tsx
import { useState } from "react";
import { Card, Form, Input, Button, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import { useLogin } from "../../features/auth/hooks/useLogin";
import { useAsyncAction } from "../../shared/actions";
import ForgotPasswordModal from "./ForgotPasswordModal";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();

  const { doLogin } = useLogin();

  // ✅ 页面负责“提示 + 跳转”
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const from = state?.from || "/enroll";

  // ===== 忘记密码弹窗 =====
  const [forgotOpen, setForgotOpen] = useState(false);
  const openForgot = () => setForgotOpen(true);
  const closeForgot = () => setForgotOpen(false);

  // ✅ 登录 action：统一 loading / 错误提示 / 成功提示
  const loginAction = useAsyncAction<void>({
    successMessage: "登录成功",
    errorMessage: "登录失败，请重试",
    onError: (e: any) => {
      // 表单校验错误：不提示
      if (e?.errorFields) return true;
    },
    onSuccess: async () => {
      navigate(from, { replace: true });
    },
  });

  const handleSubmit = () =>
    loginAction.run(async () => {
      const values = await form.validateFields();
      await doLogin(String(values.username).trim(), String(values.password));
    });

  const initialForgotUsername = String(
    form.getFieldValue("username") ?? "",
  ).trim();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: 380 }}>
        <Typography.Title level={4} style={{ textAlign: "center" }}>
          苏州大学计算机学院
          <br />
          研究生会活动管理系统
        </Typography.Title>

        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="账号"
            rules={[
              { required: true, message: "请输入账号" },
              { pattern: /^\d{11}$/, message: "账号必须为 11 位数字" },
            ]}
          >
            <Input
              placeholder="请输入 11 位账号"
              maxLength={11}
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Button
            type="primary"
            block
            loading={loginAction.loading}
            onClick={handleSubmit}
            style={{ marginTop: 8 }}
          >
            登录
          </Button>

          <div style={{ textAlign: "right", marginTop: 12 }}>
            <Typography.Link onClick={openForgot}>忘记密码？</Typography.Link>
          </div>
        </Form>
      </Card>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={closeForgot}
        initialUsername={initialForgotUsername}
      />
    </div>
  );
}
