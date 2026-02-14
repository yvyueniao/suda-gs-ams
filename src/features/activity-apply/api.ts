// src/features/activity-apply/api.ts

/**
 * 活动/讲座报名（activity-apply）领域接口
 *
 * 约定：
 * - ✅ 只做 request<T>() 封装，不做 toast / message
 * - ✅ 只返回 data（由 shared/http 统一做 ApiResponse 壳判定）
 * - ✅ token 注入、401 闭环由 shared/http/client.ts 拦截器处理
 * - ✅ 文件上传使用 multipart/form-data（✅ 交给 axios 自动设置 boundary，避免手写 Content-Type）
 */

import { request } from "../../shared/http/client";
import type { OperationResult } from "../auth/types";
import type {
  ActivityDetailResponse,
  ActivityIdPayload,
  ActivityItem,
  MyApplicationItem,
  SupplementRegisterPayload,
} from "./types";

/** 查询所有活动/讲座（全量） */
export function searchAllActivities() {
  return request<ActivityItem[]>({
    url: "/activity/searchAll",
    method: "POST",
    data: {},
  });
}

/** 按 ID 查询活动/讲座详情 */
export function searchActivityById(payload: ActivityIdPayload) {
  return request<ActivityDetailResponse>({
    url: "/activity/searchById",
    method: "POST",
    data: payload,
  });
}

/** 查询“我相关的报名记录” */
export function getMyApplications() {
  return request<MyApplicationItem[]>({
    url: "/activity/userApplications",
    method: "POST",
    data: {},
  });
}

/** 报名 */
export function registerActivity(payload: ActivityIdPayload) {
  return request<OperationResult>({
    url: "/activity/register",
    method: "POST",
    data: payload,
  });
}

/** 候补 */
export function candidateActivity(payload: ActivityIdPayload) {
  return request<OperationResult>({
    url: "/activity/candidate",
    method: "POST",
    data: payload,
  });
}

/** 取消报名 / 取消候补 /（取消审核：如果后端支持同一接口则复用） */
export function cancelActivity(payload: ActivityIdPayload) {
  return request<OperationResult>({
    url: "/activity/cancel",
    method: "POST",
    data: payload,
  });
}

/* =====================================================
 * 七、补报名（必须上传 PDF，multipart/form-data）
 * ===================================================== */

/**
 * 补报名
 *
 * 后端：
 * POST /activity/supplementRegister
 * Content-Type: multipart/form-data
 * 参数：
 * - activityId
 * - file（pdf，<=20MB）
 *
 * ✅ 注意：
 * - 不要手写 "Content-Type": "multipart/form-data"
 * - 让 axios 根据 FormData 自动生成带 boundary 的 Content-Type
 */
export function supplementRegisterActivity(payload: SupplementRegisterPayload) {
  const formData = new FormData();
  formData.append("activityId", String(payload.activityId));
  formData.append("file", payload.file);

  return request<OperationResult>({
    url: "/activity/supplementRegister",
    method: "POST",
    data: formData,
  });
}
