// src/features/rbac/user/types.ts

/**
 * ======================================
 * 角色定义（与全局保持一致）
 * ======================================
 */

export type Role = 0 | 1 | 2 | 3 | 4;

export const ROLE_LABEL: Record<Role, string> = {
  0: "管理员",
  1: "主席",
  2: "部长",
  3: "干事",
  4: "普通学生",
};

/**
 * ======================================
 * ✅ 后端统一返回壳（通用）
 * - 你们接口文档统一：{ code, msg, data, timestamp }
 * - shared/http 若“解壳只返回 data”，这里依然可以用在需要保留壳的接口链路里（比如导入结果弹窗）
 * ======================================
 */
export type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
};

/**
 * ======================================
 * 用户列表行（/user/pages 返回 users[]）
 * ======================================
 */

export interface UserListItem {
  id: number;
  username: string; // 学号
  name: string;

  email: string;
  major: string;
  grade: string;

  /**
   * ✅ 口径统一：invalid = true => 正常；false => 封锁
   * （你已明确：true=正常）
   */
  invalid: boolean;

  role: Role;

  serviceScore: number;
  lectureNum: number;

  createTime: string;
  lastLoginTime: string;
}

/** 表格行类型（直接复用列表行结构） */
export type UserTableRow = UserListItem;

/**
 * ======================================
 * 分页查询接口
 * POST /user/pages
 * ======================================
 */

export interface UserPagesQuery {
  pageNum: number;
  pageSize: number;
  key?: string;
}

export interface UserPagesResult {
  count: number;
  pageNum: number;
  users: UserListItem[];
}

/**
 * ======================================
 * 创建用户（单个）
 * POST /user/insert
 * ======================================
 */

export interface UserCreatePayload {
  username: string;
  password: string;
  name: string;
  email: string;
  major: string;
  grade: string;
}

/**
 * ======================================
 * 批量插入用户
 * POST /user/batchInsertUser
 * ======================================
 */

export type BatchInsertUserPayload = UserCreatePayload[];

/**
 * ✅ 导入结果（按你后端现状：统一返回壳，data 通常是字符串提示）
 * 示例：
 * { code: 200, msg: "操作成功", data: "成功添加2条数据", timestamp: 1770010244887 }
 *
 * 如果未来后端把 data 改成结构化对象，也能兼容：
 * ApiEnvelope<string | { successCount: number; ... } | null>
 */
export type BatchInsertUserResult = ApiEnvelope<unknown>;

/**
 * ======================================
 * 批量删除用户
 * POST /user/batchDelete
 * ======================================
 */

export type BatchDeleteUserPayload = string[]; // username[]

/**
 * ======================================
 * 批量封锁用户
 * POST /user/batchLock
 * ======================================
 */

export type BatchLockUserPayload = string[]; // username[]

/**
 * ======================================
 * 单个解封
 * POST /user/unlock
 * ======================================
 */

export interface UnlockUserPayload {
  username: string;
}

/**
 * ======================================
 * 用户详情
 * ✅ 改为：POST /user/infoforUsername
 * 返回壳：{ code, msg, data: { ...UserInfo }, timestamp }
 * ======================================
 */

export interface UserInfo {
  id: number;
  username: string;
  name: string;

  invalid: boolean; // ✅ true=正常，false=封锁
  role: Role;

  menuPermission?: unknown | null;

  email: string;
  major: string;
  grade: string;

  createTime: string;
  lastLoginTime: string;

  /** 详情接口里可能有，也可能没有（建议兼容可选） */
  serviceScore?: number;
  lectureNum?: number;

  department?: string | null;
}

/**
 * 详情接口返回壳（用于 /user/infoforUsername）
 */
export type UserInfoForUsernameResult = ApiEnvelope<UserInfo>;

/**
 * ======================================
 * 导入预览模型（前端解析 xls 后使用）
 * ======================================
 */

export interface UserImportPreviewRow {
  username: string;
  password: string;
  name: string;
  email: string;
  major: string;
  grade: string;
}
