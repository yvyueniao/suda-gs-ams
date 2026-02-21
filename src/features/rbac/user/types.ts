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

/** ✅ 导入结果：按你后端现状，返回壳 */
export type BatchInsertUserResult = ApiEnvelope<unknown>;

/**
 * ======================================
 * 批量删除用户
 * POST /user/batchDelete
 * ======================================
 */
export type BatchDeleteUserPayload = string[];

/**
 * ======================================
 * 批量封锁用户
 * POST /user/batchLock
 * ======================================
 */
export type BatchLockUserPayload = string[];

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
 * POST /user/infoforUsername
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

  serviceScore?: number;
  lectureNum?: number;

  department?: string | null;
}

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

/**
 * ======================================
 * ✅ 录入加分（/activity/special）
 * ======================================
 * 后端接口文档：
 * url：/activity/special
 * body：{ username, type, score }
 * type：0:加社会服务分 / 1:加讲座次数
 */
export type SpecialScoreType = 0 | 1;

export const SPECIAL_SCORE_TYPE_LABEL: Record<SpecialScoreType, string> = {
  0: "社会服务分",
  1: "讲座次数",
};

export interface SpecialScorePayload {
  username: string;
  type: SpecialScoreType;
  score: number;
}

/** 返回壳（data 多半是字符串提示） */
export type SpecialScoreResult = string;

/**
 * ✅ 姓名模糊搜索选项（用于 AutoComplete）
 */
export type UserNameOption = {
  username: string;
  name: string;
};
