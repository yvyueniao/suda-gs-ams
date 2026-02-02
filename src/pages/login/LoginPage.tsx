import { Card, Form, Input, Button, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { login } from "../../features/auth/api";
import { setUser } from "../../shared/session/session";

export default function LoginPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const user = await login(values);
      // 保存会话
      setUser(user);
      message.success("登录成功");
      navigate("/enroll", { replace: true });
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message);
      }
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
            name="account"
            label="账号"
            rules={[
              { required: true, message: "请输入账号" },
              { pattern: /^\d{11}$/, message: "账号必须为 11 位数字" },
            ]}
          >
            <Input placeholder="请输入账号" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
                message: "密码至少 8 位，且必须包含字母、数字和特殊字符",
              },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Button
            type="primary"
            block
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
