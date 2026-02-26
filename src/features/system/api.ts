// src/features/system/api.ts

/**
 * System API
 *
 * 当前范围：
 * - 系统日志分页查询
 *
 * 约定：
 * - 只做 request 调用
 * - 不做 toast
 * - 不做 loading
 * - 不做错误提示（交给 shared/http + shared/actions 处理）
 */

import { request } from "../../shared/http/client";
import type {
  FetchSystemLogsPayload,
  SystemLogPageResult,
  SystemLogPageData,
} from "./types";

/**
 * 获取系统日志（后端分页）
 *
 * POST /lll2lll5loo8og7gs3ss3plog01
 *
 * 后端返回结构：
 * data: {
 *   total: number,
 *   logs: SystemLogItem[]
 * }
 *
 * 前端统一结构：
 * { list, total }
 *
 * 因此在此处做字段映射：
 * logs → list
 */
export async function fetchSystemLogs(
  payload: FetchSystemLogsPayload,
): Promise<SystemLogPageResult> {
  const data = await request<SystemLogPageData>({
    url: "/lll2lll5loo8og7gs3ss3plog01",
    method: "POST",
    data: payload,
  });

  return {
    list: Array.isArray(data?.logs) ? data.logs : [],
    total: Number(data?.total ?? 0),
  };
}
