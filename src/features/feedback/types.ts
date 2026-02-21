/**
 * src/features/feedback/types.ts
 *
 * 反馈领域模型定义（强类型约束）
 *
 * ✅ 关键差异（你刚确认的口径）：
 * - /session/myFeedbacks（我的反馈）不返回 name
 * - /session/allFeedback（全部反馈）会返回 name
 *
 * 因此：
 * - 分别定义 API 返回模型：FeedbackSessionMineItem / FeedbackSessionAllItem
 * - 再提供前端统一消费模型：FeedbackSessionItem（name 可选）
 */

/* =========================================================
 * 基础枚举
 * ========================================================= */

/**
 * 反馈处理状态
 * 0: 待受理
 * 1: 处理中
 * 2: 已解决
 */
export type FeedbackState = 0 | 1 | 2;

/**
 * 聊天消息类型
 * 0: 反馈用户发言
 * 1: 系统人员发言
 *
 * ⚠ 注意：左右气泡不要用 type 判断，
 * 应以 username === 当前登录用户.username 判断“自己/他人”
 */
export type FeedbackMessageType = 0 | 1;

/* =========================================================
 * 列表：接口返回模型（按接口区分）
 * ========================================================= */

/**
 * 我的反馈列表行（普通用户）
 * POST /session/myFeedbacks
 *
 * ⚠ 不返回 name
 */
export interface FeedbackSessionMineItem {
  username: string;
  sessionId: string;
  title: string;
  time: string; // YYYY-MM-DD HH:mm:ss
  state: FeedbackState;
}

/**
 * 全部反馈列表行（管理员）
 * POST /session/allFeedback
 *
 * ✅ 返回 name
 */
export interface FeedbackSessionAllItem {
  username: string;
  name: string;
  sessionId: string;
  title: string;
  time: string; // YYYY-MM-DD HH:mm:ss
  state: FeedbackState;
}

/**
 * 前端统一消费的列表行模型（mine/all 共用）
 *
 * - mine：name 为空（undefined）
 * - all ：name 有值
 */
export type FeedbackSessionItem = FeedbackSessionMineItem & {
  name?: string;
};

/* =========================================================
 * 详情：聊天消息模型（/session/content）
 * ========================================================= */

/**
 * 单条聊天消息
 * POST /session/content
 *
 * ✅ 你前面确认：该接口会返回 name
 */
export interface FeedbackMessageItem {
  sessionId: string;
  content: string;
  fileUrl: string | null;
  time: string; // YYYY-MM-DD HH:mm:ss
  username: string;
  name: string;
  type: FeedbackMessageType;
}

/* =========================================================
 * 接口 Payload 定义
 * ========================================================= */

/** 创建反馈：POST /session/createFeedback */
export interface CreateFeedbackPayload {
  title: string;
}

/** 关闭反馈（管理员）：POST /session/close */
export interface CloseFeedbackPayload {
  sessionId: string;
}

/** 拉取聊天内容：POST /session/content */
export interface FetchFeedbackContentPayload {
  sessionId: string;
}

/**
 * 发送消息（form-data）：POST /activity/upload
 * - sessionId 必填
 * - content  必填
 * - file     可选（20MB，pdf）
 */
export interface SendFeedbackMessagePayload {
  sessionId: string;
  content: string;
  file?: File;
}

/* =========================================================
 * 业务层衍生模型（可选扩展）
 * ========================================================= */

export type FeedbackListMode = "mine" | "all";

export type FeedbackTableRow = FeedbackSessionItem;

export type FeedbackMessageList = FeedbackMessageItem[];
