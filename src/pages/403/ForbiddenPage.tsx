// src/pages/403/ForbiddenPage.tsx
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

/**
 * ForbiddenPage
 *
 * 403 无权限页面
 * - 用于页面级权限校验失败
 * - 不处理鉴权逻辑，只做展示与跳转
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="抱歉，你没有权限访问该页面"
      extra={[
        <Button type="primary" key="back" onClick={() => navigate(-1)}>
          返回上一页
        </Button>,
        <Button key="home" onClick={() => navigate("/", { replace: true })}>
          返回首页
        </Button>,
      ]}
    />
  );
}
