// src/shared/http/index.ts
/**
 * HTTP Module Public Exports
 *
 * 约定：
 * - 业务侧 / 页面侧只从这里 import（禁止深层路径引用）
 * - 本模块 =「HTTP 基础设施层」：request + 401 闭环 + 错误归一 + 列表适配
 *
 * 模块边界：
 * - ❌ 不 toast
 * - ❌ 不 navigate（仅通过 setOnUnauthorized 回调通知应用层处理）
 * - ❌ 不在业务层直接使用 axios 实例
 * - ✅ 统一抛 ApiError（供 shared/actions / hooks 层统一处理）
 */

// ======================================================
// client（唯一请求入口 + 全局回调注册）
// ======================================================
export { request, setOnUnauthorized, setOnHttpError } from "./client";

// ======================================================
// list adapter（后端全量列表 -> 前端 ListResult）
// ======================================================
export {
  toServerListParams,
  fromServerListResponse,
  unwrapApiResponse,
} from "./listAdapter";

// ======================================================
// error（统一错误模型）
// ======================================================
export { ApiError } from "./error";
export type { ApiErrorCode } from "./error";

// ======================================================
// types（统一类型）
// ======================================================
export type { ApiResponse, ListResult } from "./types";
