import { Navigate } from "react-router-dom";
import { getToken } from "../../shared/session/token";

/**
 * RootRedirect
 * - 访问 "/" 时：
 *   - 已登录（本地有 token） → 跳转到默认业务页 /enroll
 *   - 未登录 → 跳转到 /login
 *
 * 注意：
 * - 这里只做“快速分流”，不做 token 有效性校验
 * - token 的真实性由 RequireAuth 兜底校验
 */
export default function RootRedirect() {
  const token = getToken();

  return <Navigate to={token ? "/enroll" : "/login"} replace />;
}
