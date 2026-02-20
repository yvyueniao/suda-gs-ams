// src/features/activity-admin/applications/table/registers/helpers.ts

/**
 * Activity Admin · Registers Table Helpers
 *
 * 职责：
 * - 提供“报名人员列表”的本地查询策略（给 applyLocalQuery 用）
 *
 * 规则：
 * - keyword：只按 name 搜索
 * - filters：
 *    - state（0:报名成功 / 2:候补成功）
 *    - checkIn（可选）
 *    - checkOut（可选）
 * - sorter：
 *    - time
 *    - name
 *    - score
 *
 * 说明：
 * - applyLocalQuery 负责真正的升/降序，这里只提供 sortValue
 */

import type { FilterValue } from "antd/es/table/interface";
import type { RegisterRow } from "../../types";
import { parseTimeMs } from "../../../../../shared/utils/datetime";

type Filters = Record<string, FilterValue | undefined>;

function isEmptyFilter(v: FilterValue | undefined) {
  return v == null || (Array.isArray(v) && v.length === 0);
}

function matchEnumFilter(value: number, fv: FilterValue | undefined): boolean {
  if (isEmptyFilter(fv)) return true;
  const arr = Array.isArray(fv) ? fv : [];
  return arr.some((x) => Number(x) === value);
}

function matchBooleanFilter(value: boolean, fv: FilterValue | undefined) {
  if (isEmptyFilter(fv)) return true;
  const arr = Array.isArray(fv) ? fv : [];
  return arr.some((x) => Boolean(x) === value);
}

function toComparableString(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function buildRegistersLocalQueryOptions() {
  return {
    /**
     * 搜索：只匹配姓名
     */
    getSearchTexts: (row: RegisterRow) => [row.name],

    /**
     * 筛选：state + checkIn + checkOut
     */
    matchFilters: (row: RegisterRow, filters?: Filters) => {
      if (!filters) return true;

      const okState = matchEnumFilter(row.state, filters.state);
      if (!okState) return false;

      const okCheckIn = matchBooleanFilter(row.checkIn, filters.checkIn);
      if (!okCheckIn) return false;

      const okCheckOut = matchBooleanFilter(row.checkOut, filters.checkOut);
      if (!okCheckOut) return false;

      return true;
    },

    /**
     * 排序字段映射
     */
    getSortValue: (
      row: RegisterRow,
      sorter?: { field?: string; key?: string } | string | null,
    ) => {
      const field =
        typeof sorter === "string"
          ? sorter
          : (sorter?.field ?? sorter?.key ?? "");

      switch (field) {
        // 时间
        case "time":
          return parseTimeMs(row.time);

        // 字符串
        case "name":
          return toComparableString(row.name);

        // 数字
        case "score":
          return row.score;

        // 枚举
        case "state":
          return row.state;

        // 布尔
        case "checkIn":
          return row.checkIn ? 1 : 0;
        case "checkOut":
          return row.checkOut ? 1 : 0;

        default: {
          const anyRow = row as Record<string, unknown>;
          const v = anyRow[field];
          if (typeof v === "number") return v;
          if (typeof v === "string") return toComparableString(v);
          if (typeof v === "boolean") return v ? 1 : 0;
          return "";
        }
      }
    },
  };
}
