// src/features/profile/types.ts
/**
 * Profile domain types
 *
 * 当前采用方案 C：
 * - 列表：/activity/userApplications（报名记录）
 * - 详情：/activity/searchById（活动详情，点击“详情”再查）
 *
 * Profile 域只描述：
 * - 用户信息
 * - 我的“报名记录”
 * - 以及「个人中心页面真正需要用到的最小活动详情视图」
 */

// =======================
// 用户相关
// =======================

// 角色：0 管理员 / 1 主席 / 2 部长 / 3 干事 / 4 普通学生
export type UserRole = 0 | 1 | 2 | 3 | 4;

/** /user/info 返回的用户信息（data.user） */
export type UserInfo = {
  id: number;
  username: string;
  name: string;
  invalid: boolean;
  role: UserRole;

  email: string;
  major: string;
  grade: string;

  createTime: string;
  lastLoginTime: string;

  // —— 个人中心扩展字段 ——
  serviceScore?: number;
  lectureNum?: number;
  department?: string | null;
  menuPermission?: unknown;
};

/** /user/info 的 data 结构 */
export type UserInfoData = {
  user: UserInfo;
  token: string;
};

// =======================
// 我的活动（报名记录）
// =======================

/**
 * 报名状态：
 * 0 报名成功
 * 1 候补中
 * 2 候补成功
 * 3 候补失败
 */
export type ApplicationState = 0 | 1 | 2 | 3;

/**
 * 活动类型：
 * 0 活动
 * 1 讲座
 */
export type ActivityType = 0 | 1;

/**
 * /activity/userApplications 返回的单条报名记录
 *
 * ⚠️ 这里只是“关系表”，不是活动本体
 */
export type MyActivityItem = {
  activityId: number;
  username: string;

  state: ApplicationState;
  time: string;

  attachment: string | null;
  checkIn: boolean;
  getScore: boolean;
  type: ActivityType;
  score: number;
};

// =======================
// 个人中心使用的「活动详情视图」
// =======================

/**
 * 这是「个人中心详情弹窗」真正需要的字段集合
 * 来自 /activity/searchById
 *
 * ⚠️ 注意：
 * - 这是 *Profile Page* 使用的视图模型
 * - 不等同于完整 Activity 实体（避免 profile 侵入 activity 域）
 */
export type ProfileActivityDetail = {
  id: number;
  name: string;
  description: string;

  department: string;
  location: string;

  signStartTime: string;
  signEndTime: string;
  activityStime: string;
  activityEtime: string;

  type: ActivityType;
  state: number; // 0~4（直接透传后端）

  score: number;
  registeredNum: number;
  candidateNum: number;
  candidateSuccNum: number;
  candidateFailNum: number;
};

// =======================
// 预留：未来分页 / 聚合接口
// =======================

export type MyActivitiesQuery = {
  page: number;
  pageSize: number;
  keyword?: string;
  type?: ActivityType | "all";
  state?: ApplicationState | "all";
};

export type MyActivitiesListResult = {
  list: MyActivityItem[];
  total: number;
};
