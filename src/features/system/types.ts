// src/features/system/types.ts

/**
 * System / Types
 *
 * 当前范围：
 * - 系统日志分页查询
 *
 * 严格对齐接口：
 * POST /lll2lll5loo8og7gs3ss3plog01
 */

// ======================================================
// Entity
// ======================================================

/**
 * 系统日志条目
 *
 * 来源字段：
 * username / name / path / content / time / ip / address
 */
export type SystemLogItem = {
  /** 操作人用户名 */
  username: string;

  /** 操作人姓名 */
  name: string;

  /** 请求路径 */
  path: string;

  /** 请求内容（JSON 字符串） */
  content: string;

  /** 操作时间（字符串时间） */
  time: string;

  /** 操作人 IP */
  ip: string;

  /** IP 所在地址 */
  address: string;
};

// ======================================================
// Payloads
// ======================================================

/**
 * 系统日志分页请求参数
 *
 * pageNum：从 1 开始
 * pageSize：每页条数
 */
export type FetchSystemLogsPayload = {
  pageNum: number;
  pageSize: number;
};

// ======================================================
// Page Result（前端统一分页结构）
// ======================================================

/**
 * 前端统一分页返回结构
 *
 * ⚠️ 说明：
 * 后端示例返回 data: SystemLogItem[]
 * 但接口说明是分页查询，因此前端统一适配为：
 * { list, total }
 */
export type SystemLogPageResult = {
  list: SystemLogItem[];
  total: number;
};
