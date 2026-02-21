// src/features/rbac/user/table/helpers.ts

import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";

import type { Role, UserTableRow } from "../types";

/**
 * keyword 搜索文本
 * - 支持：ID / 学号 / 姓名 / 角色 / 年级 / 专业 / 邮箱 / 分数 / 时间
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
 * ✅ 筛选逻辑
 * 口径：
 *   invalid = true  => 正常
 *   invalid = false => 封锁
 */
export function matchFilters(
  row: UserTableRow,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  // 1️⃣ role 筛选
  const roleFilter = filters.role;
  if (Array.isArray(roleFilter) && roleFilter.length > 0) {
    const allowed = roleFilter.map((v) => Number(v) as Role);
    if (!allowed.includes(row.role)) return false;
  }

  // 2️⃣ invalid 筛选
  const invalidFilter = filters.invalid;
  if (Array.isArray(invalidFilter) && invalidFilter.length > 0) {
    // antd 可能传 true/false 或 "true"/"false"
    const allowed = invalidFilter.map((v) => v === true || v === "true"); // true => 正常
    const current = !!row.invalid; // true => 正常

    if (!allowed.includes(current)) return false;
  }

  return true;
}

/**
 * 本地排序值提取
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
