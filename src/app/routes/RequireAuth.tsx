import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../../shared/session/session";

/**
 * 登录态守卫
 * 未登录用户会被重定向到 /login
 */
export default function RequireAuth() {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
