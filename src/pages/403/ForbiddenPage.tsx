// src/pages/403/ForbiddenPage.tsx
import { Button, Result, Space } from "antd";
import { useNavigate } from "react-router-dom";

/**
 * ForbiddenPage
 *
 * 403 无权限页面
 * - 用于页面级权限校验失败
 * - 不处理鉴权逻辑，只做展示与跳转
 * - 排版居中 + 返回逻辑兜底
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();

  const goBack = () => {
    // 有历史记录则返回上一页，否则回首页
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/enroll", { replace: true });
    }
  };

  const goHome = () => {
    navigate("/enroll", { replace: true });
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
        status="403"
        title="403"
        subTitle="抱歉，你没有权限访问该页面"
        extra={
          <Space wrap>
            <Button type="primary" onClick={goBack}>
              返回上一页
            </Button>
            <Button onClick={goHome}>返回首页</Button>
          </Space>
        }
      />
    </div>
  );
}
