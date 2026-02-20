// src/features/activity-admin/applications/api.ts

/**
 * Activity Applications API
 *
 * 对齐后端接口（活动详情页三列表 + 补报名审核）：
 * - POST /activity/activityRegisters     报名人员列表
 * - POST /activity/activityCandidates    候补人员列表
 * - POST /activity/activitySupplements   补报名人员列表（含 attachment，可预览）
 * - POST /activity/examineSupplement     补报名审核（通过/不通过）
 *
 * 约定：
 * - 只做 request 调用
 * - 不做 toast
 * - 不做 loading
 * - 不做错误提示（交给 shared/http + shared/actions 处理）
 */

import { request } from "../../../shared/http/client";

import type {
  ActivityApplicationItem,
  FetchApplicationsPayload,
  ExamineSupplementPayload,
} from "./types";

/**
 * 报名人员列表
 * POST /activity/activityRegisters
 */
export async function fetchActivityRegisters(
  payload: FetchApplicationsPayload,
): Promise<ActivityApplicationItem[]> {
  const resp = await request<ActivityApplicationItem[]>({
    url: "/activity/activityRegisters",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 候补人员列表
 * POST /activity/activityCandidates
 */
export async function fetchActivityCandidates(
  payload: FetchApplicationsPayload,
): Promise<ActivityApplicationItem[]> {
  const resp = await request<ActivityApplicationItem[]>({
    url: "/activity/activityCandidates",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 补报名人员列表
 * POST /activity/activitySupplements
 */
export async function fetchActivitySupplements(
  payload: FetchApplicationsPayload,
): Promise<ActivityApplicationItem[]> {
  const resp = await request<ActivityApplicationItem[]>({
    url: "/activity/activitySupplements",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 补报名审核（通过 / 不通过）
 * POST /activity/examineSupplement
 *
 * view:
 * - 0：通过
 * - 5：不通过
 */
export async function examineSupplement(
  payload: ExamineSupplementPayload,
): Promise<string> {
  const resp = await request<string>({
    url: "/activity/examineSupplement",
    method: "POST",
    data: payload,
  });

  return resp;
}
