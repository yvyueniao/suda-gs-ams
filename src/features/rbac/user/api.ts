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
  UserInfoForUsernameResult,
  SpecialScorePayload,
  SpecialScoreResult,
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
 * ✅ 按你们 shared/http/request 的规则：
 * - 若后端是统一壳 => request 会解壳直接返回 data（也就是 UserInfo）
 * - 所以这里不需要再兼容 “未解壳” 的情况
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
 * body: { username, type, score }
 *
 * ✅ 后端统一壳：{ code, msg, data: string, timestamp }
 * ✅ request 会解壳：这里只会拿到 data（string）
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
