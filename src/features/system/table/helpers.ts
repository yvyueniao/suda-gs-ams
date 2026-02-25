// src/features/system/table/helpers.ts

/**
 * System Logs Table Helpers
 *
 * 职责：
 * - 提供本表格本地查询策略（给 applyLocalQuery 用）
 *
 * 方案 B（你已选）：
 * - 不做 filters（下拉筛选）
 * - keyword 作为“全文搜索”，命中以下字段：
 *   username / name / path / ip / address / content
 */

import type { SystemLogItem } from "../types";

function safe(v: unknown) {
  return String(v ?? "").trim();
}

export function buildSystemLogLocalQueryOptions() {
  return {
    /**
     * keyword 搜索命中字段
     * ✅ applyLocalQuery 会对这里的文本做包含匹配（通常是 includes / fuzzy）
     */
    getSearchTexts: (row: SystemLogItem) =>
      [
        safe(row.username),
        safe(row.name),
        safe(row.path),
        safe(row.ip),
        safe(row.address),
        safe(row.content),
      ].filter(Boolean),
  };
}
