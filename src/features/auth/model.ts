import type { UserRole } from "../../shared/types/rbac";

/** 当前登录用户 */
export interface User {
  id: string;
  name: string;
  role: UserRole;
}

/** 登录请求参数 */
export interface LoginPayload {
  account: string;
  password: string;
}
