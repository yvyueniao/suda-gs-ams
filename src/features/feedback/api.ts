// src/features/feedback/api.ts
//
// 反馈领域接口封装（纯 request，不做 toast/不维护 loading）
//
// 约定：
// - 统一走 shared/http 的 request<T>()（拦截器负责 token 注入 / 统一壳 / 错误归一）
// - mine/all 列表接口返回结构不同：mine 不带 name，all 带 name（见 types.ts）
// - 发送消息为 form-data（可选 file），不走 JSON

import { request } from "../../shared/http/client";

import type {
  FeedbackSessionMineItem,
  FeedbackSessionAllItem,
  FeedbackMessageItem,
  CreateFeedbackPayload,
  CloseFeedbackPayload,
  FetchFeedbackContentPayload,
  SendFeedbackMessagePayload,
} from "./types";

/* =========================================================
 * 列表
 * ========================================================= */

/** 我的反馈（普通用户）：POST /session/myFeedbacks */
export function fetchMyFeedbacks() {
  return request<FeedbackSessionMineItem[]>({
    url: "/session/myFeedbacks",
    method: "POST",
  });
}

/** 全部反馈（管理员）：POST /session/allFeedback */
export function fetchAllFeedbacks() {
  return request<FeedbackSessionAllItem[]>({
    url: "/session/allFeedback",
    method: "POST",
  });
}

/* =========================================================
 * 创建 / 关闭
 * ========================================================= */

/** 创建反馈：POST /session/createFeedback */
export function createFeedback(payload: CreateFeedbackPayload) {
  return request<string>({
    url: "/session/createFeedback",
    method: "POST",
    data: payload,
  });
}

/** 关闭反馈（管理员）：POST /session/close */
export function closeFeedback(payload: CloseFeedbackPayload) {
  return request<string>({
    url: "/session/close",
    method: "POST",
    data: payload,
  });
}

/* =========================================================
 * 详情：消息
 * ========================================================= */

/** 拉取反馈聊天内容：POST /session/content */
export function fetchFeedbackContent(payload: FetchFeedbackContentPayload) {
  return request<FeedbackMessageItem[]>({
    url: "/session/content",
    method: "POST",
    data: payload,
  });
}

/**
 * 发送消息（文本 + 可选附件）：POST /activity/upload
 *
 * 后端要求 form-data：
 * - sessionId: string (required)
 * - content:   string (required)
 * - file:      File   (optional, pdf <= 20MB)
 */
export function sendFeedbackMessage(payload: SendFeedbackMessagePayload) {
  const fd = new FormData();
  fd.append("sessionId", payload.sessionId);
  fd.append("content", payload.content);
  if (payload.file) fd.append("file", payload.file);

  return request<string>({
    url: "/session/upload",
    method: "POST",
    data: fd,
    // ✅ 不手动写 Content-Type；让浏览器自动带 boundary
  });
}
