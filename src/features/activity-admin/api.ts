// src/features/activity-admin/api.ts

/**
 * Activity Admin API
 *
 * V1 范围：
 * - 获取“我能管理的活动/讲座”（列表数据源）
 * - 创建活动/讲座
 * - 修改活动/讲座信息
 * - 删除活动/讲座
 * - 按 ID 查询详情（隐藏详情页 / 编辑回填）
 *
 * 约定：
 * - 只做 request 调用
 * - 不做 toast
 * - 不做 loading
 * - 不做错误提示（交给 shared/http + shared/actions 处理）
 */

import { request } from "../../shared/http/client";

import type {
  ManageableActivityItem,
  ActivityDetailResponse,
  CreateActivityPayload,
  UpdateActivityPayload,
  DeleteActivityPayload,
} from "./types";

/**
 * 获取当前用户能管理的活动/讲座（列表）
 * POST /activity/ownActivity
 */
export async function fetchOwnActivities(): Promise<ManageableActivityItem[]> {
  const resp = await request<ManageableActivityItem[]>({
    url: "/activity/ownActivity",
    method: "POST",
  });

  return resp;
}

/**
 * 创建活动/讲座
 * POST /activity/create
 */
export async function createActivity(
  payload: CreateActivityPayload,
): Promise<string> {
  const resp = await request<string>({
    url: "/activity/create",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 修改活动/讲座信息（部分更新）
 * POST /activity/updateActivityInfo
 */
export async function updateActivityInfo(
  payload: UpdateActivityPayload,
): Promise<null> {
  const resp = await request<null>({
    url: "/activity/updateActivityInfo",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 删除活动/讲座
 * POST /activity/delete
 */
export async function deleteActivity(payload: DeleteActivityPayload) {
  const resp = await request<string>({
    url: "/activity/delete",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 按 ID 查询活动/讲座详情
 * POST /activity/searchById
 */
export async function fetchActivityDetailById(
  id: number,
): Promise<ActivityDetailResponse> {
  const resp = await request<ActivityDetailResponse>({
    url: "/activity/searchById",
    method: "POST",
    data: { id },
  });

  return resp;
}
