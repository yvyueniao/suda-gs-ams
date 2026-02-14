// src/features/rbac/admin/table/helpers.ts

import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";
import type { AdminMemberTableRow } from "../types";

export function getSearchTexts(row: AdminMemberTableRow): string[] {
  const texts = [
    row.username,
    row.name,
    row.grade,
    row.department ?? "",
    row.major ?? "",
  ];

  return texts
    .filter((x) => x !== null && x !== undefined)
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/**
 * ✅ 只保留最基本筛选：department
 */
export function matchFilters(
  row: AdminMemberTableRow,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  const deptFilter = filters.department as unknown;
  if (Array.isArray(deptFilter) && deptFilter.length > 0) {
    const allowed = deptFilter.map((v) => String(v));
    if (!allowed.includes(row.department ?? "")) return false;
  }

  return true;
}

/**
 * 排序仍然保留（如果你也想砍掉排序，我也能给你一版“完全无排序”的）
 */
export function getSortValue(
  row: AdminMemberTableRow,
  sorter?: TableSorter,
): number | string {
  const field = sorter?.field;

  switch (field) {
    case "id":
      return row.id ?? 0;
    case "username":
      return String(row.username ?? "");
    case "serviceScore":
      return row.serviceScore ?? 0;
    case "lectureNum":
      return row.lectureNum ?? 0;
    case "createTime": {
      const ms = parseTimeMs(row.createTime);
      return ms ?? 0;
    }
    case "lastLoginTime": {
      const ms = parseTimeMs(row.lastLoginTime);
      return ms ?? 0;
    }
    default:
      return "";
  }
}
