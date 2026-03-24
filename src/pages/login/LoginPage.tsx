import { useMemo, useState } from "react";
import { Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

import { useLogin } from "../../features/auth/hooks/useLogin";
import { useAsyncAction } from "../../shared/actions";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { track } from "../../shared/telemetry/track";

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

  const openForgot = () => {
    track({ event: "login_open_forgot_password" });
    setForgotOpen(true);
  };

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

      // ✅ UI 行为埋点：用户触发登录提交（不含账号明文/密码）
      track({
        event: "login_submit",
        data: {
          username_len: String(values.username ?? "").trim().length,
        },
      });

      await doLogin(String(values.username).trim(), String(values.password));
    });

  const initialForgotUsername = String(
    form.getFieldValue("username") ?? "",
  ).trim();

  const featureList = useMemo(
    () => [
      "活动/讲座报名与候补全流程",
      "管理员端活动管理与审核闭环",
      "反馈中心：对话 + 附件 + 结束反馈",
    ],
    [],
  );

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* 左侧品牌区 */}
        <section className="auth-brand">
          <img
            className="auth-brand-logo"
            src="/logo.ico"
            alt="苏州大学计算机学院"
          />

          <div className="auth-brand-title">研究生会活动管理系统</div>
          <div className="auth-brand-subtitle">
            苏州大学计算机学院研究生会 · 活动管理平台
          </div>

          <ul className="auth-brand-features">
            {featureList.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        {/* 右侧登录卡 */}
        <section className="auth-card-wrapper">
          <Card className="auth-card" bordered={false}>
            <div className="auth-card-title">
              <Typography.Title level={4} style={{ margin: 0 }}>
                登录
              </Typography.Title>
              <div className="auth-card-desc">
                账号为学号；如无法登录请联系管理员
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
            >
              <Form.Item
                name="username"
                label="账号"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入账号"
                  maxLength={15}
                  inputMode="numeric"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  onPressEnter={handleSubmit}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loginAction.loading}
                className="auth-login-btn"
              >
                {loginAction.loading ? "登录中..." : "登录"}
              </Button>

              <div className="auth-forgot">
                <Typography.Link onClick={openForgot}>
                  忘记密码？
                </Typography.Link>
              </div>

              <div className="auth-footer">
                © 2026 苏州大学计算机学院研究生会
              </div>
            </Form>
          </Card>
        </section>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={closeForgot}
        initialUsername={initialForgotUsername}
      />
    </div>
  );
}
