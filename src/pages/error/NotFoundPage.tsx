// src/pages/error/NotFoundPage.tsx
import { Button, Result, Space, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

const { Text } = Typography;

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const goLogin = () => navigate("/login", { replace: true });
  const goHome = () => navigate("/", { replace: true });
  const goBack = () => navigate(-1);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#fafafa",
      }}
    >
      <Result
        status="404"
        title="页面或服务不可用"
        subTitle={
          <div style={{ display: "grid", gap: 8 }}>
            <Text type="secondary">
              当前路径：{location.pathname}
              {location.search}
            </Text>
            <Text type="secondary">
              可能原因：路由不存在 / 后端服务未启动 / 接口异常导致初始化失败
            </Text>
          </div>
        }
        extra={
          <Space wrap>
            <Button type="primary" onClick={goHome}>
              回到首页
            </Button>
            <Button onClick={goLogin}>去登录</Button>
            <Button onClick={goBack}>返回上一页</Button>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </Space>
        }
      />
    </div>
  );
}
