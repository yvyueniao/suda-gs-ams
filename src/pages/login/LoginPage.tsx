import { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";

import { login } from "../../features/auth/api";
import { encryptPassword } from "../../features/auth/crypto";
import { setToken } from "../../shared/session/token";
import { setUser } from "../../shared/session/session";
import { ApiError } from "../../shared/http/error";

export default function LoginPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  /**
   * 如果是被 RequireAuth 重定向过来的
   * location.state.from 会记录用户原本想访问的路径
   * 否则默认跳转到 /enroll
   */
  const from = (location.state as any)?.from || "/enroll";

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 按接口文档：password 需要加密后发送
      const payload = {
        username: values.username as string,
        password: encryptPassword(values.password as string),
      };

      const resp = await login(payload);

      // 保存登录态
      setToken(resp.token);
      setUser(resp.user);

      message.success("登录成功");

      // ✅ 核心改动：回跳到用户原本要去的页面
      navigate(from, { replace: true });
    } catch (err: any) {
      // antd 表单校验失败：不 toast，Form.Item 会展示错误
      if (err?.errorFields) return;

      if (err instanceof ApiError) {
        message.error(err.message);
      } else {
        message.error("登录失败，请重试");
      }
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
