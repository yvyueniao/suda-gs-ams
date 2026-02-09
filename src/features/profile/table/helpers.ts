// src/features/profile/table/helpers.ts
import {
  applyLocalQuery,
  type TableQuery,
  type TableSorter,
} from "../../../shared/components/table";

import type { MyActivityFilters, MyActivityItem } from "../types";
import {
  ACTIVITY_TYPE_LABEL,
  APPLICATION_STATE_LABEL,
  // ACTIVITY_STATE_LABEL, // 如果你后面详情弹窗也在这里用，可以打开
} from "../types";

/**
 * =========
 * 1️⃣ 展示用枚举 → 文本（纯映射，复用 types.ts，避免漂移）
 * =========
 */

export function activityTypeLabel(type?: number) {
  if (type === 0 || type === 1) return ACTIVITY_TYPE_LABEL[type];
  return "-";
}

export function applicationStateLabel(state?: number) {
  if (state === 0 || state === 1 || state === 2 || state === 3)
    return APPLICATION_STATE_LABEL[state];
  return "-";
}

export function boolLabel(v?: boolean) {
  if (v === true) return "是";
  if (v === false) return "否";
  return "-";
}

/**
 * =========
 * 2️⃣ 本地查询（全量模式核心）
 * =========
 */
export function queryMyActivities(
  rows: MyActivityItem[],
  query: TableQuery<MyActivityFilters>,
) {
  return applyLocalQuery<MyActivityItem, MyActivityFilters>(rows, query, {
    getSearchTexts: (r) => [
      r.activityName,
      r.username,
      activityTypeLabel(r.type),
      applicationStateLabel(r.state),
    ],

    matchFilters: (r, filters) => {
      if (!filters) return true;

      if (filters.type !== undefined && r.type !== filters.type) return false;
      if (filters.state !== undefined && r.state !== filters.state)
        return false;
      if (filters.checkIn !== undefined && r.checkIn !== filters.checkIn)
        return false;

      // ✅ 关键：checkOut 可缺失（undefined）
      // 这里给一个稳定口径：undefined 视为 false（没签退）
      // 如果你希望“缺失不参与筛选”，改成：
      // if (filters.checkOut !== undefined && r.checkOut !== undefined && r.checkOut !== filters.checkOut) return false;
      if (filters.checkOut !== undefined) {
        const normalized = r.checkOut ?? false;
        if (normalized !== filters.checkOut) return false;
      }

      if (filters.getScore !== undefined && r.getScore !== filters.getScore)
        return false;

      return true;
    },

    getSortValue: (r, sorter?: TableSorter) => {
      if (!sorter?.field) return null;

      switch (sorter.field) {
        case "time":
          // 后端格式 yyyy-MM-dd HH:mm:ss，字符串排序通常可用（字典序=时间序）
          return r.time;
        case "score":
          return r.score;
        default:
          return null;
      }
    },
  });
}

/**
 * =========
 * 3️⃣ 导出映射（CSV）
 * =========
 * 注意：必须返回 “presets.key 同名字段”，否则会导出空行
 */
export function mapMyActivityForExport(row: MyActivityItem) {
  return {
    activityName: row.activityName,
    type: activityTypeLabel(row.type), // 转中文
    state: applicationStateLabel(row.state), // 转中文
    time: row.time,
    checkIn: boolLabel(row.checkIn), // 转中文
    checkOut: boolLabel(row.checkOut), // 转中文（undefined => "-"）
    getScore: boolLabel(row.getScore), // 转中文
    score: row.score,
  };
}
