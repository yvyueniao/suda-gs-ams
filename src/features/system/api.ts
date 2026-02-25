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
  SystemLogItem,
  FetchSystemLogsPayload,
  SystemLogPageResult,
} from "./types";

/**
 * 获取系统日志（后端分页）
 *
 * POST /lll2lll5loo8og7gs3ss3plog01
 *
 * ⚠️ 说明：
 * 你给的接口示例返回 data: SystemLogItem[]
 * 但接口语义是分页查询。
 *
 * 为保证兼容性：
 * - 若后端返回数组 → total = 数组长度
 * - 若后端返回 { list/logs/records, count/total } → 自动适配
 */
export async function fetchSystemLogs(
  payload: FetchSystemLogsPayload,
): Promise<SystemLogPageResult> {
  const resp = await request<any>({
    url: "/lll2lll5loo8og7gs3ss3plog01",
    method: "POST",
    data: payload,
  });

  // 情况 1：后端直接返回数组
  if (Array.isArray(resp)) {
    return {
      list: resp as SystemLogItem[],
      total: resp.length,
    };
  }

  // 情况 2：后端返回分页结构
  const list: SystemLogItem[] = resp?.list ?? resp?.logs ?? resp?.records ?? [];

  const total: number =
    resp?.count ?? resp?.total ?? resp?.totalCount ?? list.length;

  return {
    list,
    total,
  };
}
