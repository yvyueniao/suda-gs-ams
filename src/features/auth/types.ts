/**
 * 后端角色枚举
 * 0: 管理员 / 1: 主席 / 2: 部长 / 3: 干事 / 4: 普通学生
 */
export type BackendRole = 0 | 1 | 2 | 3 | 4;

/**
 * 用户基础信息
 */
export interface User {
  id: number;
  username: string;
  name: string;
  invalid: boolean;
  role: BackendRole;
  menuPermission: any; // 后端预留字段，前端暂不使用
  email: string | null;
  major: string | null;
  grade: string | null;
  createTime: string;
  lastLoginTime: string;

  // /user/info 扩展字段（可选）
  serviceScore?: number;
  lectureNum?: number;
  department?: string | null;
}

/**
 * 登录请求体
 */
export interface LoginPayload {
  username: string;
  password: string; // 已加密
}

/**
 * 登录返回 data
 */
export interface LoginData {
  user: User;
  token: string;
}

/**
 * /user/info 返回 data
 */
export interface UserInfoData {
  user: User;
  token: string;
}

/**
 * 菜单节点（后端返回树形结构）
 */
export interface MenuNode {
  key: string;
  label: string;
  children: MenuNode[];
}
