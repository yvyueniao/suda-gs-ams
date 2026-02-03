import { Navigate, Outlet } from "react-router-dom";

import { getToken } from "../../shared/session/token";

/**
 * OnlyGuest
 * - 已登录（本地存在 token）：不允许访问登录页，直接跳转到默认业务页
 * - 未登录：允许进入登录页
 *
 * 使用场景：
 * <Route element={<OnlyGuest />}>
 *   <Route path="/login" element={<LoginPage />} />
 * </Route>
 */
export default function OnlyGuest() {
  const token = getToken();

  // 已登录用户访问 /login → 直接去业务首页
  if (token) {
    return <Navigate to="/enroll" replace />;
  }

  // 未登录用户 → 放行
  return <Outlet />;
}
