// src/features/profile/api.ts
/**
 * Profile domain API
 *
 * 当前采用方案 C：
 * - 列表：/activity/userApplications（报名记录）
 * - 详情：/activity/searchById（点“详情”再拉）
 *
 * 设计原则（与你当前 http/client.ts 完全对齐）：
 * 1. api 层只负责“描述接口”
 * 2. 统一使用 request<T>() —— 永远只返回 data
 * 3. 业务 code != 200 的情况，已经在 http 层统一 throw ApiError
 * 4. api / hook / page 层不再感知 ApiResponse/code
 */

import { request } from "../../shared/http/client";
import type {
  MyActivityItem,
  UserInfoData,
  ProfileActivityDetail,
} from "./types";

/* =========================
 * 用户信息
 * ========================= */

/** 获取当前用户信息（POST /user/info）
 * 返回：
 * {
 *   user: UserInfo;
 *   token: string;
 * }
 */
export function getUserInfo() {
  return request<UserInfoData>({
    url: "/user/info",
    method: "POST",
    data: {},
  });
}

/* =========================
 * 我的活动（报名记录）
 * ========================= */

/** 获取“我报名/候补过的活动/讲座”
 * POST /activity/userApplications
 *
 * 返回：
 * MyActivityItem[]
 */
export function getMyActivities() {
  return request<MyActivityItem[]>({
    url: "/activity/userApplications",
    method: "POST",
    data: {},
  });
}

/* =========================
 * 活动详情（方案 C 核心）
 * ========================= */

/** 按 activityId 获取活动/讲座详情
 * POST /activity/searchById
 *
 * 返回：
 * {
 *   activity: ProfileActivityDetail
 * }
 */
export function getActivityDetailById(activityId: number) {
  return request<{ activity: ProfileActivityDetail }>({
    url: "/activity/searchById",
    method: "POST",
    data: { id: activityId },
  });
}

/* =========================
 * 预留扩展（未启用）
 * ========================= */

/**
 * 如果后端未来把“我的活动”升级成分页接口，例如：
 * POST /activity/userApplicationsPaged
 *
 * 你只需要：
 * 1. 打开下面代码
 * 2. 在 types.ts 中使用 MyActivitiesQuery / MyActivitiesListResult
 * 3. ProfilePage 中切换到 SmartTable + useTableData
 */

// import type {
//   MyActivitiesQuery,
//   MyActivitiesListResult,
// } from "./types";

// export function getMyActivitiesPaged(query: MyActivitiesQuery) {
//   return request<MyActivitiesListResult>({
//     url: "/activity/userApplicationsPaged",
//     method: "POST",
//     data: query,
//   });
// }
