// src/features/activity-apply/types.ts

/**
 * ============================================
 * 活动/讲座 报名领域类型定义
 * ============================================
 *
 * 设计原则：
 * - ✅ 后端字段保持原样，不做改名
 * - ✅ 前端派生状态单独定义（避免污染接口模型）
 * - ✅ 不包含 UI 类型
 *
 * 额外约定（为避免踩坑）：
 * - ActivityItem.state 仅表示“活动状态”
 * - MyApplicationItem.state 仅表示“报名状态”
 * - 表格里展示“我的报名状态”请使用 EnrollTableRow.applyState（前端派生）
 */

export type ActivityType = 0 | 1; // 0: 活动 / 1: 讲座
export type ActivityState = 0 | 1 | 2 | 3 | 4;
/**
 * 0: 未开始
 * 1: 报名中
 * 2: 报名结束
 * 3: 进行中
 * 4: 已结束
 */

export type ApplicationState = 0 | 1 | 2 | 3 | 4 | 5;
/**
 * 0: 报名成功
 * 1: 候补中
 * 2: 候补成功
 * 3: 候补失败
 * 4: 审核中
 * 5: 审核失败
 */

/* =====================================================
 * 一、活动列表（/activity/searchAll）
 * ===================================================== */

export interface ActivityItem {
  id: number;

  name: string;
  description: string;

  department: string;
  time: string; // 创建时间（后端返回原样）

  signStartTime: string;
  signEndTime: string;

  fullNum: number;
  score: number;
  location: string;

  activityStime: string;
  activityEtime: string;

  type: ActivityType;

  state: ActivityState;

  registeredNum: number;
  candidateNum: number;
  candidateSuccNum: number;
  candidateFailNum: number;
}

/* =====================================================
 * 二、活动详情（/activity/searchById）
 * ===================================================== */

export interface ActivityDetail extends ActivityItem {}

/**
 * searchById 返回结构：
 * {
 *   activity: ActivityDetail
 * }
 */
export interface ActivityDetailResponse {
  activity: ActivityDetail;
}

/* =====================================================
 * 三、我的报名记录（/activity/userApplications）
 * ===================================================== */

export interface MyApplicationItem {
  activityId: number;

  username: string;

  state: ApplicationState;

  time: string;

  attachment: string | null;

  checkIn: boolean;
  checkOut: boolean;

  getScore: boolean;
  type: ActivityType;

  score: number;

  activityName: string;
}

/* =====================================================
 * 四、前端派生类型（按钮状态机用）
 * ===================================================== */

/**
 * 前端按钮状态（由 ActivityItem + MyApplicationItem 派生）
 *
 * 注意：
 * - 这是 UI 语义状态
 * - 不直接等同于后端 state
 */
export type ApplyActionState =
  | "NOT_APPLIED" // 未报名
  | "APPLIED" // 报名成功
  | "CANDIDATE" // 候补中
  | "CANDIDATE_SUCC" // 候补成功
  | "CANDIDATE_FAIL" // 候补失败
  | "REVIEWING" // 审核中
  | "REVIEW_FAIL"; // 审核失败

/**
 * 合并后的表格行模型
 * （列表页渲染专用）
 */
export interface EnrollTableRow extends ActivityItem {
  /** 我的报名记录（若无则表示未报名） */
  myApplication?: MyApplicationItem;

  /** 前端派生状态（表格里展示/筛选“我的报名状态”以此为准） */
  applyState: ApplyActionState;
}

/* =====================================================
 * 五、动作参数类型
 * ===================================================== */

export interface ActivityIdPayload {
  id: number;
}

/* =====================================================
 * 六、工具类型
 * ===================================================== */

/**
 * activityId -> MyApplicationItem 映射
 *
 * ⚠️ 注意：不要把 Map 直接作为 React state 并原地 mutate，
 * 否则可能导致 React 认为引用未变化而不刷新。
 */
export type MyApplicationMap = Map<number, MyApplicationItem>;
