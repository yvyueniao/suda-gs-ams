// src/features/rbac/user/table/helpers.ts

import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";

import type { Role, UserTableRow } from "../types";

/**
 * keyword 搜索文本
 * - 你要求：邮箱/年级/专业都展示
 * - 所以这里把常用可搜字段都纳入（实现“模糊一搜就能命中”）
 */
export function getSearchTexts(row: UserTableRow): string[] {
  const texts = [
    row.id,
    row.username,
    row.name,

    row.role,

    row.grade,
    row.major,
    row.email,

    row.serviceScore,
    row.lectureNum,

    row.createTime,
    row.lastLoginTime,
  ];

  return texts
    .filter((x) => x !== null && x !== undefined)
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/**
 * ✅ 筛选：
 * - invalid：账号状态（正常/封锁）
 * - role：角色
 *
 * 口径对齐 antd：FilterValue = (Key | boolean)[] | null
 * 注意：invalid 可能是 true/false 或 "true"/"false"
 */
export function matchFilters(
  row: UserTableRow,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  // 1) role
  const roleFilter = filters.role;
  if (Array.isArray(roleFilter) && roleFilter.length > 0) {
    const allowed = roleFilter.map((v) => Number(v) as Role);
    if (!allowed.includes(row.role)) return false;
  }

  // 2) invalid
  const invalidFilter = filters.invalid;
  if (Array.isArray(invalidFilter) && invalidFilter.length > 0) {
    const allowed = invalidFilter.map((v) => v === true || v === "true");
    if (!allowed.includes(!!row.invalid)) return false;
  }

  return true;
}

/**
 * 本地排序值提取
 * - sorter.field 来自 columns.tsx 的 dataIndex/key
 * - 时间字段使用 parseTimeMs
 */
export function getSortValue(
  row: UserTableRow,
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

    case "name":
      return String(row.name ?? "");

    case "grade":
      return String(row.grade ?? "");

    case "major":
      return String(row.major ?? "");

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
