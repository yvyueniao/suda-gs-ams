// src/features/feedback/table/helpers.ts
//
// 反馈列表 - 本地查询策略（给 applyLocalQuery 用）
//
// 只负责：
// - keyword 搜索字段提取（getSearchTexts）
// - filters 匹配（matchFilters）
// - sorter 值提取（getSortValue）
//
// 约定：
// - mine：keyword 只搜 title
// - all ：keyword 搜 title + name（兜底也搜 username，避免 name 缺失时搜不到）
// - filters：只做 state（0/1/2）
// - sorter：主做 time（可选 state）

import type { FilterValue } from "antd/es/table/interface";
import type {
  FeedbackSessionItem,
  FeedbackState,
  FeedbackListMode,
} from "../types";
import { parseTimeMs } from "../../../shared/utils/datetime";

/* =========================================================
 * keyword 搜索
 * ========================================================= */

function toText(v: unknown) {
  const s = String(v ?? "").trim();
  return s;
}

/**
 * 提供给 applyLocalQuery.keyword 的“可搜索文本数组”
 *
 * - mine：只搜 title
 * - all ：搜 title + name（兜底 username）
 */
export function getSearchTexts(
  row: FeedbackSessionItem,
  mode: FeedbackListMode,
): string[] {
  if (mode === "mine") return [toText(row.title)];

  // admin(all)：title + name（兜底 username）
  return [toText(row.title), toText(row.name), toText(row.username)];
}

/* =========================================================
 * filters（仅 state）
 * ========================================================= */

function normalizeEnumFilterValues(values: FilterValue | null | undefined) {
  // antd filters 口径：FilterValue = (Key | boolean)[] | null
  if (!values || !Array.isArray(values)) return null;
  const nums = values
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n)) as number[];
  return nums.length ? nums : null;
}

/**
 * 匹配 filters
 * - 当前只支持：state
 *
 * filters 口径（你们 shared/table）：query.filters 是一个对象
 * 例如：{ state: [0, 1] }
 */
export function matchFilters(
  row: FeedbackSessionItem,
  filters?: Record<string, FilterValue | null | undefined>,
): boolean {
  if (!filters) return true;

  // state
  if ("state" in filters) {
    const allow = normalizeEnumFilterValues(filters.state);
    if (allow && !allow.includes(Number(row.state))) return false;
  }

  return true;
}

/* =========================================================
 * sorter（time 为主，可选 state）
 * ========================================================= */

/**
 * 提供给 applyLocalQuery.sorter 的“可比较值”
 *
 * 约定 key 对齐 columns.tsx 的 key：
 * - time
 * - state（可选）
 * - title（不建议开启 sorter，但这里给兜底）
 * - name/username（也给兜底）
 */
export function getSortValue(
  row: FeedbackSessionItem,
  sortKey: string,
): string | number {
  switch (sortKey) {
    case "time":
      // 后端格式 "YYYY-MM-DD HH:mm:ss"；统一转 ms，保证稳定排序
      return parseTimeMs(row.time) ?? 0;

    case "state":
      return Number(row.state ?? 0);

    case "title":
      return toText(row.title);

    case "name":
      return toText(row.name);

    case "username":
      return toText(row.username);

    case "sessionId":
      return toText(row.sessionId);

    default:
      // 未知 key：返回 0，避免排序崩
      return 0;
  }
}

/* =========================================================
 * 可选：状态显示（给 columns.tsx / 页面复用）
 * ========================================================= */

export const FEEDBACK_STATE_LABEL: Record<FeedbackState, string> = {
  0: "待受理",
  1: "处理中",
  2: "已解决",
};
