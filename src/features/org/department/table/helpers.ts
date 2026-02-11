// src/features/org/department/table/helpers.ts

/**
 * Department Table Helpers
 *
 * 职责：
 * - 提供本表格本地查询策略（给 applyLocalQuery 用）
 *
 * V1 规则：
 * - keyword 仅匹配 department（部门名称）
 */

import type { DepartmentItem } from "../types";

export function buildDepartmentLocalQueryOptions() {
  return {
    getSearchTexts: (row: DepartmentItem) => [row.department],
  };
}
