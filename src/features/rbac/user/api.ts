/** src/features/rbac/user/api.ts
 * ======================================
 * 用户管理 API
 * ======================================
 *
 * 约定：
 * - 统一通过 shared/http 的 request 发请求
 * - 不在这里做 toast，不 catch（交给 hooks/actions 处理）
 * - 适配后端字段（pageNum/pageSize/key）
 */

import { request } from "../../../shared/http";
import type {
  UserPagesQuery,
  UserPagesResult,
  UserListItem,
  UserCreatePayload,
  BatchInsertUserPayload,
  BatchInsertUserResult,
  BatchDeleteUserPayload,
  BatchLockUserPayload,
  UnlockUserPayload,
  UserInfo,
  SpecialScorePayload,
  SpecialScoreResult,

  // ✅ 新增类型
  UsernameApplicationItem,
  UsersScoreByTimePayload,
  UsersScoreByTimeItem,
} from "./types";

/**
 * ======================================
 * 1) 分页查询用户
 * POST /user/pages
 * ======================================
 */
export async function getUserPages(
  params: UserPagesQuery,
): Promise<{ list: UserListItem[]; total: number }> {
  const res = await request<UserPagesResult>({
    url: "/user/pages",
    method: "POST",
    data: {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      key: params.key ?? undefined,
    },
  });

  return {
    list: Array.isArray(res.users) ? res.users : [],
    total: typeof res.count === "number" ? res.count : 0,
  };
}

/**
 * ======================================
 * 2) 批量插入用户
 * POST /user/batchInsertUser
 * ======================================
 */
export async function batchInsertUser(
  payload: BatchInsertUserPayload,
): Promise<BatchInsertUserResult> {
  return request<BatchInsertUserResult>({
    url: "/user/batchInsertUser",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 3) 创建单个用户
 * POST /user/insert
 * ======================================
 */
export async function insertUser(payload: UserCreatePayload): Promise<void> {
  await request<void>({
    url: "/user/insert",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 4) 批量删除用户
 * POST /user/batchDelete
 * ======================================
 */
export async function batchDeleteUser(
  payload: BatchDeleteUserPayload,
): Promise<void> {
  await request<void>({
    url: "/user/batchDelete",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 5) 批量封锁用户
 * POST /user/batchLock
 * ======================================
 */
export async function batchLockUser(
  payload: BatchLockUserPayload,
): Promise<void> {
  await request<void>({
    url: "/user/batchLock",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 6) 单个解封
 * POST /user/unlock
 * ======================================
 */
export async function unlockUser(payload: UnlockUserPayload): Promise<void> {
  await request<void>({
    url: "/user/unlock",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 7) 用户详情
 * POST /user/inforUsername
 *
 * ✅ request 已解壳 => 直接返回 UserInfo
 * ======================================
 */
export async function getUserInfo(username: string): Promise<UserInfo> {
  return request<UserInfo>({
    url: "/user/inforUsername",
    method: "POST",
    data: { username },
  });
}

/**
 * ======================================
 * 8) ✅ 录入加分
 * POST /activity/special
 *
 * ✅ request 解壳 => 返回 data（通常是 string）
 * ======================================
 */
export async function specialAddScore(
  payload: SpecialScorePayload,
): Promise<SpecialScoreResult> {
  return request<SpecialScoreResult>({
    url: "/activity/special",
    method: "POST",
    data: payload,
  });
}

/**
 * ======================================
 * 9) ✅ 根据 username 查询其相关活动
 * POST /activity/usernameApplications
 *
 * ✅ request 解壳 => 返回 data（UsernameApplicationItem[]）
 * ======================================
 */
export async function getUsernameApplications(
  username: string,
): Promise<UsernameApplicationItem[]> {
  return request<UsernameApplicationItem[]>({
    url: "/activity/usernameApplications",
    method: "POST",
    data: { username },
  });
}

/**
 * ======================================
 * 10) ✅ 删除用户特殊加分（报名记录删除）
 * POST /activity/deleteApply
 *
 * body: { id }
 *
 * ✅ request 解壳 => 返回 data（通常是 string 提示）
 * ======================================
 */
export async function deleteApply(id: number): Promise<string> {
  return request<string>({
    url: "/activity/deleteApply",
    method: "POST",
    data: { id },
  });
}

/**
 * ======================================
 * 11) ✅ 根据时间段获取用户活动/讲座分数
 * POST /user/usersScoreByTime
 *
 * body: { startTime, endTime }
 *
 * ✅ request 解壳 => 返回 data（UsersScoreByTimeItem[]）
 * ======================================
 */
export async function usersScoreByTime(
  payload: UsersScoreByTimePayload,
): Promise<UsersScoreByTimeItem[]> {
  return request<UsersScoreByTimeItem[]>({
    url: "/user/usersScoreByTime",
    method: "POST",
    data: payload,
  });
}
