// src/features/profile/api.ts
/**
 * Profile API
 *
 * 注意：shared/http/client.ts 的 request<T>() 会自动把“统一壳”解包为 data
 * 所以这里的泛型 T 应该写 data 的类型，而不是 ApiResponse<T>
 */

import { request } from "../../shared/http/client";
import type { ListResult } from "../../shared/http/types";
import type { UserInfo, MyActivityItem } from "./types";

/**
 * 获取当前登录用户的个人信息
 * POST /user/info
 * 返回 data: { user: UserInfo; token: string }
 */
export async function getUserInfo(): Promise<UserInfo> {
  const data = await request<{ user: UserInfo; token: string }>({
    url: "/user/info",
    method: "POST",
  });

  return data.user;
}

/**
 * 查询「我的活动 / 讲座」列表
 * POST /profile/myActivities（当前 mock）
 * 返回 data: { list: MyActivityItem[]; total: number }
 */
export async function getMyActivities(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<ListResult<MyActivityItem>> {
  const data = await request<ListResult<MyActivityItem>>({
    url: "/profile/myActivities",
    method: "POST",
    data: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      keyword: params?.keyword ?? "",
    },
  });

  return data;
}
