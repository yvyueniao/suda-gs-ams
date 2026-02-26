// src/features/rbac/user/table/apps.helpers.ts

import type { TableSorter } from "../../../../shared/components/table";
import { parseTimeMs } from "../../../../shared/utils/datetime";

import type { UsernameApplicationItem } from "../types";

/**
 * 用户详情 - 报名记录表：本地查询 helpers
 *
 * ✅ 关键修复（你之前 TS 报错根因）：
 * - helpers 里不要再自造 UserApplicationRow
 * - 直接使用后端返回的 UsernameApplicationItem 作为“行类型唯一真相源”
 *
 * ✅ keyword：只搜索 activityName
 * ✅ filters：type/state/checkIn/checkOut/getScore
 * ✅ sorter：支持 activityName / type / state / time / score / activityId
 */

export type UserAppsFilters = {
  type?: any; // antd FilterValue
  state?: any;
  checkIn?: any;
  checkOut?: any;
  getScore?: any;
};

function normText(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

/**
 * ✅ keyword 搜索文本
 * - 只支持：activityName
 */
export function getSearchTexts(
  row: UsernameApplicationItem,
): Array<string | number | null | undefined> {
  const name = normText((row as any).activityName);
  return name ? [name] : [];
}

/**
 * ✅ 筛选逻辑
 * - type/state：按 number
 * - checkIn/checkOut/getScore：按 boolean（兼容 "true"/"false"）
 */
export function matchFilters(
  row: UsernameApplicationItem,
  filters?: Record<string, any>,
): boolean {
  if (!filters) return true;

  const anyRow = row as any;

  // 1) type
  const typeFilter = filters.type;
  if (Array.isArray(typeFilter) && typeFilter.length > 0) {
    const allowed = typeFilter.map((v) => Number(v));
    if (!allowed.includes(Number(anyRow.type))) return false;
  }

  // 2) state
  const stateFilter = filters.state;
  if (Array.isArray(stateFilter) && stateFilter.length > 0) {
    const allowed = stateFilter.map((v) => Number(v));
    if (!allowed.includes(Number(anyRow.state))) return false;
  }

  // helper：将 antd filter 的值统一成 boolean
  const toBool = (v: any) => v === true || v === "true";

  // 3) checkIn
  const checkInFilter = filters.checkIn;
  if (Array.isArray(checkInFilter) && checkInFilter.length > 0) {
    const allowed = checkInFilter.map(toBool);
    const current = !!anyRow.checkIn;
    if (!allowed.includes(current)) return false;
  }

  // 4) checkOut
  const checkOutFilter = filters.checkOut;
  if (Array.isArray(checkOutFilter) && checkOutFilter.length > 0) {
    const allowed = checkOutFilter.map(toBool);
    const current = !!anyRow.checkOut;
    if (!allowed.includes(current)) return false;
  }

  // 5) getScore
  const getScoreFilter = filters.getScore;
  if (Array.isArray(getScoreFilter) && getScoreFilter.length > 0) {
    const allowed = getScoreFilter.map(toBool);
    const current = !!anyRow.getScore;
    if (!allowed.includes(current)) return false;
  }

  return true;
}

/**
 * ✅ 本地排序值提取
 * - time：按时间戳排序（parseTimeMs）
 */
export function getSortValue(
  row: UsernameApplicationItem,
  sorter?: TableSorter,
): number | string {
  const anyRow = row as any;
  const field = sorter?.field;

  switch (field) {
    case "activityName":
      return String(anyRow.activityName ?? "");

    case "type":
      return Number(anyRow.type ?? 0);

    case "state":
      return Number(anyRow.state ?? 0);

    case "score":
      return Number(anyRow.score ?? 0);

    case "activityId":
      return Number(anyRow.activityId ?? 0);

    case "time": {
      const ms = parseTimeMs(anyRow.time);
      return ms ?? 0;
    }

    default:
      return "";
  }
}
