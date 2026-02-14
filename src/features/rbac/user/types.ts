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

  /** 账号是否封锁 */
  invalid: boolean;

  /** 角色：你页面要展示/筛选/排序，所以这里建议改成必填 Role */
  role: Role;

  /** 业务统计：你页面要展示/排序，所以这里建议改成必填 number */
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
 * 导入结果（根据后端返回结构建模）
 * 如果后端返回更多字段，可再扩展
 */
export interface BatchInsertUserResult {
  successCount: number;
  failCount: number;

  /** 失败用户名列表（可选） */
  failedUsernames?: string[];

  /** 失败明细（可选） */
  failedDetails?: Array<{
    username: string;
    reason: string;
  }>;

  /** 若后端返回失败文件下载地址 */
  failedFileUrl?: string;
}

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
 * POST /user/info
 * ======================================
 *
 * 注意：/user/info 返回里有 user + token（你接口文档里是这种结构）
 * 但你们 shared/http 可能已经把 data 解壳了
 * 这里先按 “详情 user 本体” 建模
 */

export interface UserInfo {
  id: number;
  username: string;
  name: string;

  email: string;
  major: string;
  grade: string;

  invalid: boolean;
  role: Role;

  createTime: string;
  lastLoginTime: string;

  serviceScore: number;
  lectureNum: number;

  department?: string | null;
}

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
