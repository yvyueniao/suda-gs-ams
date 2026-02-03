import { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";

import { useLogin } from "../../features/auth/hooks/useLogin";

export default function LoginPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { doLogin } = useLogin();

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // ✅ 页面只负责拿到用户输入，再交给 useLogin 处理
      await doLogin(values.username as string, values.password as string);
    } catch (err: any) {
      // antd 表单校验失败：不 toast，Form.Item 会展示错误
      if (err?.errorFields) return;

      // doLogin 内部已经 message.error 过了
      // 这里不需要重复提示
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    message.info("忘记密码功能暂未开放，请联系管理员");
  };

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
            loading={submitting}
            onClick={handleSubmit}
            style={{ marginTop: 8 }}
          >
            登录
          </Button>

          <div style={{ textAlign: "right", marginTop: 12 }}>
            <Typography.Link onClick={handleForgotPassword}>
              忘记密码？
            </Typography.Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
