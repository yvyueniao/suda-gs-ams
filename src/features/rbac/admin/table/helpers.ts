import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";
import type { AdminMemberTableRow } from "../types";

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
 * ✅ 只保留 department 筛选
 * 口径对齐 antd：FilterValue = (Key | boolean)[] | null
 */
export function matchFilters(
  row: AdminMemberTableRow,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  const deptFilter = filters.department;

  // antd 的 filters 永远是数组或 null
  if (Array.isArray(deptFilter) && deptFilter.length > 0) {
    const allowed = deptFilter.map((v) => String(v));
    const current = String(row.department ?? "");

    if (!allowed.includes(current)) {
      return false;
    }
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
