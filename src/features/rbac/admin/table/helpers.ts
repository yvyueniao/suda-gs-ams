//\features\rbac\admin\table\helpers.ts
import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";

import type { AdminMemberTableRow, Role } from "../types";

/**
 * keyword 搜索文本
 */
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
 * ✅ 恢复列筛选：department / role / invalid
 * 口径对齐 antd：FilterValue = (Key | boolean)[] | null
 *
 * 注意：
 * - filters 里每个字段永远是数组或 null/undefined
 * - 我们不依赖 antd 的 onFilter，统一在这里做“本地筛选”
 */
export function matchFilters(
  row: AdminMemberTableRow,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  // 1) department
  const deptFilter = filters.department;
  if (Array.isArray(deptFilter) && deptFilter.length > 0) {
    const allowed = deptFilter.map((v) => String(v));
    const current = String(row.department ?? "");
    if (!allowed.includes(current)) return false;
  }

  // 2) role
  const roleFilter = filters.role;
  if (Array.isArray(roleFilter) && roleFilter.length > 0) {
    const allowed = roleFilter.map((v) => Number(v) as Role);
    if (!allowed.includes(row.role)) return false;
  }

  // 3) invalid（注意 antd 可能传 true/false 或 "true"/"false"）
  const invalidFilter = filters.invalid;
  if (Array.isArray(invalidFilter) && invalidFilter.length > 0) {
    const allowed = invalidFilter.map((v) => v === true || v === "true");
    if (!allowed.includes(!!row.invalid)) return false;
  }

  return true;
}

/**
 * 本地排序
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

    case "role":
      return row.role ?? 0;

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
