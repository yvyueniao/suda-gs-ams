export type BackendRole = 0 | 1 | 2 | 3 | 4; // 0管理员/1主席/2部长/3干事/4普通学生

export interface User {
  id: number;
  username: string;
  name: string;
  invalid: boolean;
  role: BackendRole;
  menuPermission: any; // 当前用不上，先 any
  email: string | null;
  major: string | null;
  grade: string | null;
  createTime: string;
  lastLoginTime: string;
}

export interface LoginPayload {
  username: string; // ✅ 注意：接口字段名是 username
  password: string; // ✅ 需要加密后发送（我们做了加密入口）
}

export interface LoginData {
  user: User;
  token: string;
}
