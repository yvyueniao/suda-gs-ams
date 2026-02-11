// src/pages/error/ServerErrorPage.tsx
import { Button, Result, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

type ErrorNavState = { from?: string };

export default function ServerErrorPage() {
  const nav = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ErrorNavState;

  const handleRetry = () => {
    // ✅ 优先回到来源页，让 RequireAuth/页面请求重新触发
    nav(state.from || "/", { replace: true });
  };

  return (
    <Result
      status="500"
      title="服务暂时不可用"
      subTitle="可能是网络异常或服务器开小差了。你可以重试，或稍后再试。"
      extra={
        <Space>
          <Button type="primary" onClick={handleRetry}>
            重试
          </Button>
          <Button onClick={() => nav("/", { replace: true })}>回到首页</Button>
        </Space>
      }
    />
  );
}
