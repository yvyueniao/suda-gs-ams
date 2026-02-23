// src/pages/error/ServerErrorPage.tsx
import { Button, Result, Space, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

const { Text } = Typography;

type ErrorNavState = { from?: string };

export default function ServerErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ErrorNavState;

  // 默认首页统一为 /enroll（避免再走一层 / 重定向）
  const goHome = () => navigate("/enroll", { replace: true });

  const handleRetry = () => {
    // 优先回到来源页，让 RequireAuth / 页面请求重新触发
    if (state.from) {
      navigate(state.from, { replace: true });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      goHome();
    }
  };

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
        status="500"
        title="服务暂时不可用"
        subTitle={
          <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
            <Text type="secondary">可能是网络异常或服务器开小差了。</Text>
            <Text type="secondary">
              建议：点击“重试”重新触发页面请求，或稍后再试。
            </Text>
          </div>
        }
        extra={
          <Space wrap>
            <Button type="primary" onClick={handleRetry}>
              重试
            </Button>
            <Button onClick={goHome}>回到首页</Button>
          </Space>
        }
      />
    </div>
  );
}
