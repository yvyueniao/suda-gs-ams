// src/features/profile/types.ts
/**
 * Profile Domain Types
 * 用于：个人中心页面（ProfilePage）
 */

/* ===========================
 * 通用：操作类接口返回
 * =========================== */

/**
 * 后端很多“操作类接口”data 可能是：
 * - string（如：成功修改1条数据）
 * - null（如：部分 update 接口会返回 null）
 * 用统一类型避免业务层误以为永远有文案
 */
export type OperationResult = string | null;

/* ===========================
 * 用户信息
 * =========================== */

/** 用户角色 */
export type UserRole =
  | 0 // 管理员
  | 1 // 主席
  | 2 // 部长
  | 3 // 干事
  | 4; // 普通学生

/** 个人中心用户信息（/user/info -> data.user） */
export interface UserInfo {
  id: number;
  username: string;
  name: string;

  /**
   * 后端字段：invalid
   * 注意：接口文档对其语义存在歧义（“是否有效账户 / 是否无效”两种写法都出现过）
   * 前端此处先保持原字段名与类型，UI 侧如需展示请自行做 isValid/label 映射
   */
  invalid: boolean;

  role: UserRole;

  email: string;
  major: string;
  grade: string;
  department: string | null;

  serviceScore: number; // 社会服务分
  lectureNum: number; // 学术讲座次数

  createTime: string;
  lastLoginTime: string;
}

/* ===========================
 * 我的活动（列表）
 * =========================== */

/** 活动类型 */
export type ActivityType =
  | 0 // 活动
  | 1; // 讲座

/** 报名状态（/activity/userApplications） */
export type ApplicationState =
  | 0 // 报名成功
  | 1 // 候补中
  | 2 // 候补成功
  | 3; // 候补失败

/** 个人中心 - 我的活动列表项（/activity/userApplications） */
export interface MyActivityItem {
  activityId: number;
  activityName: string;

  username: string;
  type: ActivityType;

  state: ApplicationState;
  score: number;

  time: string; // 申请时间（后端字符串：yyyy-MM-dd HH:mm:ss）

  attachment: string | null;

  checkIn: boolean;

  /** ✅ 兼容：后端/Mock 可能缺字段，做成可选更稳 */
  checkOut?: boolean;

  getScore: boolean;
}

/* ===========================
 * 我的活动（表格筛选 filters）
 * =========================== */

/** “我的活动”表格筛选条件（前端本地过滤使用） */
export type MyActivityFilters = {
  type?: ActivityType;
  state?: ApplicationState;
  checkIn?: boolean;
  checkOut?: boolean;
  getScore?: boolean;
};

/* ===========================
 * 活动详情（详情弹窗）
 * =========================== */

/** 活动状态（/activity/searchById） */
export type ActivityState =
  | 0 // 未开始
  | 1 // 报名中
  | 2 // 报名结束
  | 3 // 进行中
  | 4; // 已结束

/** 活动详情（/activity/searchById -> data.activity） */
export interface ActivityDetail {
  id: number;
  name: string;
  description: string;

  department: string;
  time: string;

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

/* ===========================
 * 枚举文案映射（UI 使用）
 * =========================== */

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  0: "活动",
  1: "讲座",
};

export const APPLICATION_STATE_LABEL: Record<ApplicationState, string> = {
  0: "报名成功",
  1: "候补中",
  2: "候补成功",
  3: "候补失败",
};

export const ACTIVITY_STATE_LABEL: Record<ActivityState, string> = {
  0: "未开始",
  1: "报名中",
  2: "报名结束",
  3: "进行中",
  4: "已结束",
};

/* ===========================
 * 账户设置（表单提交）
 * =========================== */

/** 修改邮箱（/user/updateEmail） */
export interface UpdateEmailPayload {
  email: string;
}

/** 修改密码（/user/modifyPassword） */
export interface ModifyPasswordPayload {
  oldPassword: string;
  newPassword1: string;
  newPassword2: string;
}
