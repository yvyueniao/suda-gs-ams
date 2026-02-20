// src/features/activity-admin/applications/types.ts

/**
 * Activity Applications Domain Types
 *
 * 适用范围：
 * - 报名人员列表（/activity/activityRegisters）
 * - 候补人员列表（/activity/activityCandidates）
 * - 补报名人员列表（/activity/activitySupplements）
 * - 补报名审核（/activity/examineSupplement）
 *
 * 约定：
 * - 严格对齐后端字段
 * - 不在页面层随意扩展 any
 * - 三列表结构统一（字段完全一致，仅 state 范围不同）
 */

// ======================================================
// Enums
// ======================================================

/**
 * 活动类型
 * 0: 活动
 * 1: 讲座
 */
export type ActivityType = 0 | 1;

/**
 * 报名状态（统一口径 0~5）
 *
 * 0: 报名成功
 * 1: 候补中
 * 2: 候补成功
 * 3: 候补失败
 * 4: 审核中（补报名）
 * 5: 审核失败（补报名）
 */
export type ApplicationState = 0 | 1 | 2 | 3 | 4 | 5;

// ======================================================
// Entity（统一行模型）
// ======================================================

/**
 * 三列表统一行结构
 *
 * 后端字段来源：
 * - /activity/activityRegisters
 * - /activity/activityCandidates
 * - /activity/activitySupplements
 */
export type ActivityApplicationItem = {
  /** 活动ID */
  activityId: number;

  /** 学号/账号 */
  username: string;

  /** 姓名 ⭐（新增字段，三个接口都已返回） */
  name: string;

  /** 报名状态 */
  state: ApplicationState;

  /** 申请时间 */
  time: string;

  /**
   * 附件URL（补报名才一定有，其他列表可能为 null）
   * 你已确认：无需 token，可直接新标签页预览
   */
  attachment: string | null;

  /** 是否签到 */
  checkIn: boolean;

  /** 是否签退 */
  checkOut: boolean;

  /** 是否获得分数 */
  getScore: boolean;

  /** 活动类型 */
  type: ActivityType;

  /** 分数 */
  score: number;
};

// ======================================================
// 语义别名（增强可读性）
// ======================================================

/**
 * 报名人员列表行
 * state 通常为 0 / 2
 */
export type RegisterRow = ActivityApplicationItem;

/**
 * 候补人员列表行
 * state 通常为 1 / 3
 */
export type CandidateRow = ActivityApplicationItem;

/**
 * 补报名人员列表行
 * state 通常为 4 / 5
 */
export type SupplementRow = ActivityApplicationItem;

// ======================================================
// Payloads
// ======================================================

/**
 * 查询三列表通用入参
 * POST /activity/activityRegisters
 * POST /activity/activityCandidates
 * POST /activity/activitySupplements
 */
export type FetchApplicationsPayload = {
  activityId: number;
};

/**
 * 补报名审核
 * POST /activity/examineSupplement
 *
 * view:
 * 0 -> 审核通过
 * 5 -> 审核不通过
 */
export type ExamineSupplementPayload = {
  activityId: number;
  username: string;
  view: 0 | 5;
};
