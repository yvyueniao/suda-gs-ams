// src/features/activity-admin/applications/table/candidates/helpers.ts

/**
 * Activity Admin · Candidates Table Helpers
 *
 * 职责：
 * - 提供“候补人员列表”的本地查询策略（给 applyLocalQuery 用）
 *
 * 你已确定的规则：
 * - keyword：只按 name 搜索
 * - filters：只处理 state（候补相关：1/2/3），其他字段即使传入也忽略
 * - sorter：
 *   - 时间：time
 *   - 字符串：name / username
 *   - 数字：activityId / score
 *   - 枚举：state / type
 *
 * 注意：
 * - antd FilterValue 口径：Key[] | null
 * - applyLocalQuery 会根据 query.sorter.order 决定升/降序，这里只提供 sortValue
 */

import type { FilterValue } from "antd/es/table/interface";

import type { CandidateRow } from "../../types";
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

/**
 * 构建候补表的本地查询策略
 */
export function buildCandidatesLocalQueryOptions() {
  return {
    /**
     * keyword 只匹配 name
     */
    getSearchTexts: (row: CandidateRow) => [row.name],

    /**
     * filters：只处理 state
     */
    matchFilters: (row: CandidateRow, filters?: Filters) => {
      if (!filters) return true;

      // 只认可 state
      const okState = matchEnumFilter(row.state, filters.state);
      if (!okState) return false;

      // 候补列表只期望 1/2/3，但这里不强行拦截（避免后端新增状态导致“看不见”）
      return true;
    },

    /**
     * sorter：返回“可比较”的值（number / string）
     */
    getSortValue: (
      row: CandidateRow,
      sorter?: { field?: string; key?: string } | string | null,
    ) => {
      const field =
        typeof sorter === "string"
          ? sorter
          : (sorter?.field ?? sorter?.key ?? "");

      switch (field) {
        // ===== 时间类 =====
        case "time":
          return parseTimeMs(row.time);

        // ===== 字符串类 =====
        case "name":
          return toComparableString(row.name);
        case "username":
          return toComparableString(row.username);

        // ===== 数字类 =====
        case "activityId":
          return row.activityId;
        case "score":
          return row.score;

        // ===== 枚举类 =====
        case "state":
          return row.state;
        case "type":
          return row.type;

        // ===== 兜底 =====
        default: {
          const anyRow = row as Record<string, unknown>;
          const v = anyRow[field];
          if (typeof v === "number") return v;
          if (typeof v === "string") return toComparableString(v);
          // boolean 排序：true > false（随便给个稳定口径）
          if (typeof v === "boolean") return v ? 1 : 0;
          return "";
        }
      }
    },

    /**
     * （可选）你如果想强制候补表只能出现 1/2/3：
     * - 可以在 useCandidatesTable 里先把 d.list 过滤掉非 1/2/3 再交给 applyLocalQuery
     * - 这里不做 hard filter，避免后端变更时“表空了不好排查”
     */
  };
}
