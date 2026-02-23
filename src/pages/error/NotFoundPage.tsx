// src/pages/error/NotFoundPage.tsx
import { Button, Result, Space, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

const { Text } = Typography;

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 你项目默认主页是 /enroll（避免先跳 / 再重定向）
  const goHome = () => navigate("/enroll", { replace: true });
  const goLogin = () => navigate("/login", { replace: true });

  // ✅ 返回上一页：无历史记录时兜底回首页
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else goHome();
  };

  const fullPath = `${location.pathname}${location.search || ""}`;

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
        title="页面不存在或暂时不可用"
        subTitle={
          <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
            <Text type="secondary">当前路径：{fullPath}</Text>
            <Text type="secondary">
              可能原因：路由不存在 / 你输入了错误地址 / 服务未启动 /
              初始化请求失败导致跳转
            </Text>
            <Text type="secondary">
              建议：先尝试刷新；如果一直出现，检查后端是否启动、接口是否可用。
            </Text>
          </div>
        }
        extra={
          <Space wrap>
            <Button type="primary" onClick={goHome}>
              回到首页
            </Button>
            <Button onClick={goBack}>返回上一页</Button>
            <Button onClick={goLogin}>去登录</Button>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </Space>
        }
      />
    </div>
  );
}
