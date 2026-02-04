// src/features/profile/types.ts
/**
 * Profile Domain Types
 *
 * 说明：
 * - 本文件只描述「个人中心」领域的数据模型
 * - 不包含任何 UI/表格实现细节
 * - 字段命名尽量与后端语义一致，但保持前端可读性
 */

/**
 * 用户基础信息（来自 /user/info）
 * - 对齐后端返回的 user 字段
 */
export type UserInfo = {
  id: number;
  username: string; // 学号 / 账号
  name: string; // 姓名
  invalid: boolean; // 是否无效账户
  role: number; // 0 管理员 / 1 主席 / 2 部长 / 3 干事 / 4 普通学生
  menuPermission: any; // 当前阶段不用，保持透传
  email: string;
  major: string;
  grade: string;
  createTime: string; // 创建时间
  lastLoginTime: string; // 上次登录时间

  /** 个人中心扩展字段 */
  serviceScore: number; // 社会服务分
  lectureNum: number; // 学术讲座次数
  department: string | null; // 所属部门
};

/**
 * 个人中心中「我的活动 / 讲座」列表项
 * - 当前由 mock 接口返回
 * - 后端正式接口出来后，字段可在 adapter 层做映射
 */
export type MyActivityItem = {
  id: number;

  /** 标题 */
  title: string;

  /** 类型：活动 / 讲座 */
  category: "activity" | "lecture";

  /**
   * 当前状态
   * - pending   ：未开始
   * - signed    ：已报名
   * - attended  ：已完成 / 已参加
   * - cancelled ：已取消
   */
  status: "pending" | "signed" | "attended" | "cancelled";

  /** 活动 / 讲座时间段（展示用） */
  timeRange: string;

  /** 地点 */
  location: string;

  /** 主办方 */
  organizer: string;

  /** 本次获得的社会服务分（讲座一般为 0） */
  serviceScoreGain: number;

  /** 报名/创建时间 */
  createdAt: string;
};
