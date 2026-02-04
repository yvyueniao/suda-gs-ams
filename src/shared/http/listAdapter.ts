// src/shared/http/listAdapter.ts
/**
 * List Adapter (skeleton)
 *
 * 角色定位：
 * - 这是“前端统一表格模型 ↔ 后端不确定协议”的唯一适配层
 * - 任何后端字段名差异、返回壳差异，都只允许出现在这里
 *
 * 当前阶段（先搭骨架）：
 * - 只定义输入/输出类型与函数签名
 * - 不写死任何后端字段名（pageNum/records/code 等）
 * - 具体映射规则等后端接口确定后再补
 *
 * 设计原则：
 * - table 组件域只认 TableQuery / ListResult
 * - http 层负责把“后端世界”翻译成“前端世界”
 */

import type { TableQuery } from "../components/table/types";
import type { ListResult } from "./types";

/**
 * 将前端 TableQuery 转换为“后端请求参数”
 *
 * 注意：
 * - params 的字段名此处故意用 unknown Record
 * - 具体字段（page/pageSize/current/size/...）等后端定了再实现
 */
export function toServerListParams<
  F extends Record<string, any> = Record<string, any>,
>(query: TableQuery<F>): Record<string, unknown> {
  // TODO:
  // 在这里根据后端约定做字段映射，例如：
  // return {
  //   pageNum: query.page,
  //   pageSize: query.pageSize,
  //   keyword: query.keyword,
  //   ...query.filters,
  //   sortField: query.sorter?.field,
  //   sortOrder: query.sorter?.order,
  // };

  void query;

  return {};
}

/**
 * 将“后端列表响应”转换为前端统一的 ListResult
 *
 * 注意：
 * - 后端响应壳可能是：
 *   { list, total }
 *   { records, total }
 *   { data: { rows, total } }
 *   ApiResponse<{ list, total }>
 * - 这些差异全部在这里消化
 */
export function fromServerListResponse<T>(response: unknown): ListResult<T> {
  // TODO:
  // 在这里解析 response，抽取 list / total
  // 示例（伪代码）：
  // const data = unwrapApiResponse(response);
  // return {
  //   list: data.list ?? data.records ?? [],
  //   total: data.total ?? 0,
  // };

  void response;

  return {
    list: [],
    total: 0,
  };
}

/**
 * 可选工具：从统一后端壳中解包 data
 * - 如果你们后端是 ApiResponse<T>（code/msg/data）
 * - 可以在这里集中处理
 */
export function unwrapApiResponse<T = unknown>(resp: unknown): T {
  // TODO:
  // if (isApiResponse(resp)) {
  //   if (resp.code !== 0) throw new ApiError(resp.code, resp.msg);
  //   return resp.data as T;
  // }
  // return resp as T;

  return resp as T;
}
