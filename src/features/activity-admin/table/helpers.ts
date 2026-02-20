// src/features/activity-admin/table/helpers.ts

/**
 * Activity Admin Table Helpers
 *
 * 职责：
 * - 提供本表格本地查询策略（给 applyLocalQuery 用）
 *
 * 你已确定的规则：
 * - keyword 只匹配 name
 * - filters 仅支持：type / state（对齐 antd FilterValue：数组 | null）
 * - sorter 支持：
 *   - 时间：time / signStartTime / signEndTime / activityStime / activityEtime
 *   - 数字：score / fullNum / registeredNum / candidateNum
 *   - 枚举：type / state
 *   - 字符串：department
 */

import type { FilterValue } from "antd/es/table/interface";
import type { ManageableActivityItem } from "../types";
import { parseTimeMs } from "../../../shared/utils/datetime";

type Filters = Record<string, FilterValue | undefined>;

function isEmptyFilter(v: FilterValue | undefined) {
  return v == null || (Array.isArray(v) && v.length === 0);
}

function matchEnumFilter(value: number, fv: FilterValue | undefined): boolean {
  if (isEmptyFilter(fv)) return true;
  // antd 口径：FilterValue = (Key[] | null)
  const arr = Array.isArray(fv) ? fv : [];
  return arr.some((x) => Number(x) === value);
}

function toComparableString(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

/**
 * 构建本表格的本地查询策略
 */
export function buildActivityAdminLocalQueryOptions() {
  return {
    /**
     * keyword 只匹配 name
     */
    getSearchTexts: (row: ManageableActivityItem) => [row.name],

    /**
     * filters 仅处理：type / state
     * 其他字段即使出现在 filters 里也忽略（保证口径稳定）
     */
    matchFilters: (row: ManageableActivityItem, filters?: Filters) => {
      if (!filters) return true;

      const okType = matchEnumFilter(row.type, filters.type);
      if (!okType) return false;

      const okState = matchEnumFilter(row.state, filters.state);
      if (!okState) return false;

      return true;
    },

    /**
     * sorter：返回“可比较”的值（number / string）
     * applyLocalQuery 会根据 order 决定升/降序，这里只提供 sortValue
     *
     * 兼容 sorter 传入形态：
     * - sorter.field（antd 常见）
     * - sorter.key   （你们内部可能用 key）
     * - 直接传 string（极少数）
     */
    getSortValue: (
      row: ManageableActivityItem,
      sorter?: { field?: string; key?: string } | string | null,
    ) => {
      const field =
        typeof sorter === "string"
          ? sorter
          : (sorter?.field ?? sorter?.key ?? "");

      switch (field) {
        // ===== 时间类（统一转 ms）=====
        case "time":
          return parseTimeMs(row.time);
        case "signStartTime":
          return parseTimeMs(row.signStartTime);
        case "signEndTime":
          return parseTimeMs(row.signEndTime);
        case "activityStime":
          return parseTimeMs(row.activityStime);
        case "activityEtime":
          return parseTimeMs(row.activityEtime);

        // ===== 数字类 =====
        case "id":
          return row.id;
        case "score":
          return row.score;
        case "fullNum":
          return row.fullNum;
        case "registeredNum":
          return row.registeredNum;
        case "candidateNum":
          return row.candidateNum;
        case "candidateSuccNum":
          return row.candidateSuccNum;
        case "candidateFailNum":
          return row.candidateFailNum;

        // ===== 枚举 / 字符串 =====
        case "type":
          return row.type;
        case "state":
          return row.state;
        case "department":
          return toComparableString(row.department);

        // ===== 兜底：能排就排，不认识就给空值 =====
        default: {
          const anyRow = row as Record<string, unknown>;
          const v = anyRow[field];
          if (typeof v === "number") return v;
          if (typeof v === "string") return toComparableString(v);
          return "";
        }
      }
    },
  };
}
