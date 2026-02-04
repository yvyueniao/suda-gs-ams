// src/app/routes/RequireRole.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { getToken } from "../../shared/session/token";
import { getUser } from "../../shared/session/session";

/**
 * 角色定义（与后端保持一致）
 * 0: 管理员
 * 1: 主席
 * 2: 部长
 * 3: 干事
 * 4: 普通学生
 */
export type Role = 0 | 1 | 2 | 3 | 4;

interface RequireRoleProps {
  /**
   * 允许访问该页面的角色列表
   * 使用 readonly，方便直接接 routeAccess.ts 中的 ROLES.xxx
   */
  allow: readonly Role[];
}

/**
 * RequireRole
 *
 * 页面级权限守卫（Route Guard）
 *
 * 负责：
 * 1. 未登录 → 跳转 /login（并记录 from）
 * 2. user 未 ready → loading
 * 3. role 不在 allow 中 → 跳转 /403
 *
 * 不负责：
 * - 按钮 / 组件级细粒度权限
 * - 接口级权限校验（由后端兜底）
 */
export function RequireRole({ allow }: RequireRoleProps) {
  const location = useLocation();

  // ① 未登录：去登录页
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ② user 还没准备好（通常发生在 App 初始化阶段）
  const user = getUser();
  if (!user) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const role = user.role as Role;

  // ③ 无权限：跳 403
  if (!allow.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  // ④ 有权限：放行
  return <Outlet />;
}
