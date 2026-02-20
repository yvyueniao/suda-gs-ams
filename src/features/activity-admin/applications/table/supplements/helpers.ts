// src/features/activity-admin/applications/table/supplements/helpers.ts

/**
 * Activity Admin · Supplements Table Helpers
 *
 * 职责：
 * - 提供“补报名人员列表”的本地查询策略（给 applyLocalQuery 用）
 *
 * 规则：
 * - keyword：只按 name 搜索
 * - filters：只处理 state（4:审核中 / 5:审核失败）
 * - sorter：
 *    - state
 *    - time
 *    - name
 *
 * 说明：
 * - applyLocalQuery 负责真正的升/降序，这里只提供 sortValue
 * - 不在此处做 state 强过滤（避免后端未来扩展导致数据被“误吃掉”）
 */

import type { FilterValue } from "antd/es/table/interface";
import type { SupplementRow } from "../../types";
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

function toComparableString(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function buildSupplementsLocalQueryOptions() {
  return {
    /**
     * 搜索：只匹配姓名
     */
    getSearchTexts: (row: SupplementRow) => [row.name],

    /**
     * 筛选：只处理 state（审核中 / 审核失败）
     */
    matchFilters: (row: SupplementRow, filters?: Filters) => {
      if (!filters) return true;

      const okState = matchEnumFilter(row.state, filters.state);
      if (!okState) return false;

      return true;
    },

    /**
     * 排序字段映射
     */
    getSortValue: (
      row: SupplementRow,
      sorter?: { field?: string; key?: string } | string | null,
    ) => {
      const field =
        typeof sorter === "string"
          ? sorter
          : (sorter?.field ?? sorter?.key ?? "");

      switch (field) {
        // ===== 审核优先 =====
        case "state":
          return row.state;

        // ===== 时间类 =====
        case "time":
          return parseTimeMs(row.time);

        // ===== 字符串类 =====
        case "name":
          return toComparableString(row.name);
        case "username":
          return toComparableString(row.username);

        // ===== 数字类 =====
        case "score":
          return row.score;
        case "activityId":
          return row.activityId;

        // ===== 枚举类 =====
        case "type":
          return row.type;

        // ===== 布尔类 =====
        case "checkIn":
          return row.checkIn ? 1 : 0;
        case "checkOut":
          return row.checkOut ? 1 : 0;
        case "getScore":
          return row.getScore ? 1 : 0;

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
