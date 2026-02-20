/**src\features\activity-admin\types.ts
 * Activity Admin Domain Types
 *
 * V1 范围：
 * - 我能管理的活动列表（/activity/ownActivity）
 * - 创建活动（/activity/create）
 * - 修改活动（/activity/updateActivityInfo）
 * - 删除活动（/activity/delete）
 * - 详情查询（/activity/searchById）
 *
 * 约定：
 * - 严格对齐后端接口字段
 * - 不在页面层随意扩展 any
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
 * 活动状态
 * 0: 未开始
 * 1: 报名中
 * 2: 报名结束
 * 3: 进行中
 * 4: 已结束
 */
export type ActivityState = 0 | 1 | 2 | 3 | 4;

// ======================================================
// Entity（来自 /activity/ownActivity）
// ======================================================

/**
 * 当前用户能管理的活动条目
 * 来源：POST /activity/ownActivity
 */
export type ManageableActivityItem = {
  id: number;

  /** 活动名称 */
  name: string;

  /** 描述 */
  description: string;

  /** 所属部门 */
  department: string;

  /** 创建时间 */
  time: string;

  /** 报名开始时间 */
  signStartTime: string;

  /** 报名截止时间 */
  signEndTime: string;

  /** 活动人数上限 */
  fullNum: number;

  /** 分数 */
  score: number;

  /** 地点 */
  location: string;

  /** 活动开始时间 */
  activityStime: string;

  /** 活动结束时间 */
  activityEtime: string;

  /** 类型（0:活动 / 1:讲座） */
  type: ActivityType;

  /** 状态 */
  state: ActivityState;

  /** 报名成功人数 */
  registeredNum: number;

  /** 候补人数 */
  candidateNum: number;

  /** 候补成功人数 */
  candidateSuccNum: number;

  /** 候补失败人数 */
  candidateFailNum: number;
};

// ======================================================
// Detail（来自 /activity/searchById）
// ======================================================

/**
 * 活动详情响应结构
 */
export type ActivityDetailResponse = {
  activity: ManageableActivityItem;
};

// ======================================================
// Payloads
// ======================================================

/**
 * 创建活动
 * POST /activity/create
 *
 * 注意：
 * signStartTime < signEndTime < activityStime < activityEtime
 */
export type CreateActivityPayload = {
  name: string;
  description: string;
  signStartTime: string;
  signEndTime: string;
  fullNum: number;
  score: number;
  location: string;
  activityStime: string;
  activityEtime: string;
  type: ActivityType;
};

/**
 * 更新活动信息
 * POST /activity/updateActivityInfo
 *
 * 说明：
 * - id 必传
 * - 其余字段可选（按需传）
 */
export type UpdateActivityPayload = {
  id: number;

  signStartTime?: string;
  signEndTime?: string;
  fullNum?: number;
  score?: number;
  activityStime?: string;
  activityEtime?: string;
};

/**
 * 删除活动
 * POST /activity/delete
 */
export type DeleteActivityPayload = {
  id: number;
};
