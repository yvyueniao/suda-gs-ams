// src/features/profile/api.ts
import { request } from "../../shared/http/client";
import type {
  UserInfo,
  MyActivityItem,
  ActivityDetail,
  UpdateEmailPayload,
  ModifyPasswordPayload,
  OperationResult,
} from "./types";

/**
 * 获取当前登录用户信息
 * POST /user/info
 *
 * 后端返回：ApiResponse<{ user: UserInfo; token: string }>
 * request<T>() 会自动解到 data，所以这里 T = { user: UserInfo; token: string }
 */
export function getMyProfile(): Promise<UserInfo> {
  return request<{ user: UserInfo; token: string }>({
    url: "/user/info",
    method: "POST",
  }).then((res) => res.user);
}

/**
 * 获取“我报名的活动 / 讲座”
 * POST /activity/userApplications
 *
 * 后端返回：ApiResponse<MyActivityItem[]>
 */
export function getMyApplications(): Promise<MyActivityItem[]> {
  return request<MyActivityItem[]>({
    url: "/activity/userApplications",
    method: "POST",
  });
}

/**
 * 获取活动详情（详情弹窗）
 * POST /activity/searchById
 *
 * 后端返回：ApiResponse<{ activity: ActivityDetail }>
 * request<T>() 解到 data，所以这里 T = { activity: ActivityDetail }
 */
export function getActivityDetail(activityId: number): Promise<ActivityDetail> {
  return request<{ activity: ActivityDetail }>({
    url: "/activity/searchById",
    method: "POST",
    data: { id: activityId },
  }).then((res) => res.activity);
}

/**
 * 修改邮箱
 * POST /user/updateEmail
 *
 * 后端 data 可能是 string（成功修改1条数据）或 null（少数接口）
 * 用 OperationResult 统一承接
 */
export function updateEmail(
  payload: UpdateEmailPayload,
): Promise<OperationResult> {
  return request<OperationResult>({
    url: "/user/updateEmail",
    method: "POST",
    data: payload,
  });
}

/**
 * 修改密码
 * POST /user/modifyPassword
 *
 * 后端 data 可能是 string 或 null
 * 用 OperationResult 统一承接
 */
export function modifyPassword(
  payload: ModifyPasswordPayload,
): Promise<OperationResult> {
  return request<OperationResult>({
    url: "/user/modifyPassword",
    method: "POST",
    data: payload,
  });
}
