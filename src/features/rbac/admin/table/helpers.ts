// src/features/rbac/admin/table/helpers.ts

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
 * ✅ 列筛选：department / role / invalid
 * 口径：invalid = true => 正常，false => 封锁
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

  // 3) invalid
  // antd 可能传 true/false 或 "true"/"false"
  // ✅ 口径：true = 正常，false = 封锁
  const invalidFilter = filters.invalid;
  if (Array.isArray(invalidFilter) && invalidFilter.length > 0) {
    const allowed = invalidFilter.map((v) => v === true || v === "true"); // true => 正常
    const current = !!row.invalid; // true => 正常
    if (!allowed.includes(current)) return false;
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
