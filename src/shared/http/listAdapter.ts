// src/shared/http/listAdapter.ts
/**
 * List Adapter (client-side)
 *
 * 当前后端约定（suda_union）：
 * - 后端只返回“全量数据”
 * - 分页/筛选/搜索/排序：全部在前端 Table 体系中完成
 *
 * 因此：
 * - toServerListParams：默认返回 {}（不向后端传分页/筛选字段，避免误导）
 * - fromServerListResponse：把后端返回统一成 { list, total }，其中 total = list.length
 */

import type { ApiResponse, ListResult } from "./types";
import type { TableQuery } from "../components/table/types";
import { ApiError } from "./error";

function isPlainObject(x: unknown): x is Record<string, any> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isApiResponse(x: unknown): x is ApiResponse<unknown> {
  return (
    isPlainObject(x) &&
    typeof x.code === "number" &&
    typeof x.msg === "string" &&
    "data" in x
  );
}

/**
 * 后端不做分页/筛选：默认不传任何 TableQuery 参数
 *
 * 如果未来有“必须传”的后端参数（例如 type=0/1 区分活动/讲座），
 * 建议在业务 api.ts 自己显式传，而不是从 TableQuery 隐式映射。
 */
export function toServerListParams<
  F extends Record<string, any> = Record<string, any>,
>(_query: TableQuery<F>): Record<string, unknown> {
  return {};
}

/**
 * 将后端响应转换为前端统一的 ListResult
 *
 * 兼容形式：
 * 1) T[]                       -> { list: T[], total: list.length }
 * 2) ApiResponse<T[]>          -> 解包后走 (1)
 * 3) { data: T[] } / { list }  -> 防御性兼容（如果后端偶尔多包一层）
 */
export function fromServerListResponse<T>(response: unknown): ListResult<T> {
  // 防御：如果意外传进来的是完整 ApiResponse
  if (isApiResponse(response)) {
    if (response.code !== 200) {
      throw new ApiError(
        response.msg || "请求失败",
        "BIZ_ERROR",
        undefined,
        response.code,
      );
    }
    return fromServerListResponse<T>(response.data);
  }

  // 1) 直接数组：你们接口文档里大多数列表就是这种
  if (Array.isArray(response)) {
    return { list: response as T[], total: response.length };
  }

  // 3) 防御性：偶尔多包一层
  if (isPlainObject(response)) {
    const maybeData = (response as any).data;
    if (Array.isArray(maybeData)) {
      return { list: maybeData as T[], total: maybeData.length };
    }

    const maybeList =
      (response as any).list ??
      (response as any).records ??
      (response as any).rows;
    if (Array.isArray(maybeList)) {
      return { list: maybeList as T[], total: maybeList.length };
    }
  }

  return { list: [], total: 0 };
}

/**
 * 可选工具：从统一后端壳中解包 data
 *
 * 注意：你们的 request<T>() 已经做了“拆壳 + code!=200 抛错”，
 * 所以一般用不到；这里只做兜底工具。
 */
export function unwrapApiResponse<T = unknown>(resp: unknown): T {
  if (isApiResponse(resp)) {
    if (resp.code !== 200) {
      throw new ApiError(
        resp.msg || "请求失败",
        "BIZ_ERROR",
        undefined,
        resp.code,
      );
    }
    return resp.data as T;
  }
  return resp as T;
}
