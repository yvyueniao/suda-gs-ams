// src/features/profile/table/helpers.ts

/**
 * ============================================
 * profile/table/helpers
 * ============================================
 *
 * 文件定位：
 * - features/profile/table 层
 * - 为“个人中心：我的活动/讲座表格”提供纯工具函数（不含 UI / 不含 React）
 *
 * 设计目标：
 * 1) ✅ 不拉接口：不 import api，不做请求
 * 2) ✅ 不依赖 React：可被 hooks / node mock / 单测复用
 * 3) ✅ 保持纯函数：输入确定 => 输出确定（便于测试）
 *
 * 当前能力：
 * - 展示用枚举 → 文本（复用 types.ts 的 label 常量，避免漂移）
 * - 本地查询：搜索 / 筛选 / 排序（applyLocalQuery）
 * - 导出映射：将行数据映射为 CSV 可读字段（中英文/布尔值等）
 *
 * ✅ 与报名模块抽离对齐：
 * - 时间字段的排序/解析统一走 shared/utils/datetime
 *   这样避免不同模块各自写 Date.parse 导致兼容差异
 *
 * ✅ 本次修复：
 * - applicationStateLabel 支持 0-5（报名模块已更新到 6 个状态：0~5）
 * - ✅ filters 支持多选（数组口径）：type/state/checkIn/checkOut/getScore/canScore
 *   这样“同时勾选 活动+讲座”会正确显示两类数据
 */

import {
  applyLocalQuery,
  type TableQuery,
  type TableSorter,
} from "../../../shared/components/table";

import type { MyActivityFilters, MyActivityItem } from "../types";
import { ACTIVITY_TYPE_LABEL, APPLICATION_STATE_LABEL } from "../types";

import { parseTimeMs } from "../../../shared/utils/datetime";

/* =====================================================
 * 0) 小工具：派生字段
 * ===================================================== */

/** ✅ 是否加分：只有签到 && 签退 都为 true 才可加分 */
export function canGetScore(
  record: Pick<MyActivityItem, "checkIn" | "checkOut">,
) {
  return Boolean(record.checkIn) && Boolean(record.checkOut);
}

/* =====================================================
 * 1) 展示用枚举 → 文本（纯映射）
 * - 复用 types.ts，避免“字段枚举与文案”在多个文件漂移
 * ===================================================== */

export function activityTypeLabel(type?: number) {
  if (type === 0 || type === 1) return ACTIVITY_TYPE_LABEL[type];
  return "-";
}

export function applicationStateLabel(state?: number) {
  // ✅ 支持 0-5
  if (
    state === 0 ||
    state === 1 ||
    state === 2 ||
    state === 3 ||
    state === 4 ||
    state === 5
  ) {
    // Record<number,string> 下标访问时做一次兜底
    return APPLICATION_STATE_LABEL[state as 0 | 1 | 2 | 3 | 4 | 5] ?? "-";
  }
  return "-";
}

export function boolLabel(v?: boolean) {
  if (v === true) return "是";
  if (v === false) return "否";
  return "-";
}

/* =====================================================
 * 2) 本地查询（全量模式核心）
 * - 统一收敛“搜索/筛选/排序”，页面与 hook 只负责传 rows + query
 * ===================================================== */

export function queryMyActivities(
  rows: MyActivityItem[],
  query: TableQuery<MyActivityFilters>,
) {
  return applyLocalQuery<MyActivityItem, MyActivityFilters>(rows, query, {
    /**
     * 本地搜索文本来源：
     * - 把可能被用户搜到的字段统一放这里
     * - ✅ 这里直接复用 label 函数，让搜索支持“中文类型/状态”
     */
    getSearchTexts: (r) =>
      [
        r.activityName,
        r.username,
        activityTypeLabel(r.type),
        applicationStateLabel(r.state),
        // 注意：过滤空值
      ].filter((v): v is string => !!v),

    /**
     * 本地筛选（✅ 支持多选数组）
     *
     * 约定（与 antd 多选 filters 对齐）：
     * - filters.xxx 为 undefined 或 []：表示“不筛选该字段”
     * - 否则：只要 record 的值命中数组任意一项即通过
     *
     * checkOut 缺失：
     * - 这里口径：undefined 视为 false（没签退）
     *   如果你希望“缺失不参与筛选”，看下面注释替代写法
     */
    matchFilters: (r, filters) => {
      if (!filters) return true;

      // ✅ type 多选（活动/讲座）
      if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(r.type)) return false;
      }

      // ✅ state 多选
      if (filters.state && filters.state.length > 0) {
        if (!filters.state.includes(r.state)) return false;
      }

      // ✅ checkIn 多选（true/false）
      if (filters.checkIn && filters.checkIn.length > 0) {
        if (!filters.checkIn.includes(Boolean(r.checkIn))) return false;
      }

      // ✅ checkOut 多选（true/false）
      if (filters.checkOut && filters.checkOut.length > 0) {
        const normalized = r.checkOut ?? false;
        if (!filters.checkOut.includes(Boolean(normalized))) return false;

        // 如果你希望“缺失不参与筛选”，改成下面这种：
        // if (r.checkOut !== undefined && !filters.checkOut.includes(Boolean(r.checkOut))) return false;
      }

      // ✅ getScore 多选
      if (filters.getScore && filters.getScore.length > 0) {
        if (!filters.getScore.includes(Boolean(r.getScore))) return false;
      }

      // ✅ 派生列：是否加分 多选
      if (filters.canScore && filters.canScore.length > 0) {
        const v = canGetScore(r);
        if (!filters.canScore.includes(v)) return false;
      }

      return true;
    },

    /**
     * 本地排序值提取：
     * - ✅ 不要直接用字符串排序假设后端格式永远稳定
     * - 统一用 parseTimeMs，把 yyyy-MM-dd HH:mm:ss 解析为毫秒再排序
     */
    getSortValue: (r, sorter?: TableSorter) => {
      if (!sorter?.field) return null;

      switch (sorter.field) {
        case "time":
          return parseTimeMs(r.time) ?? 0;
        case "score":
          return r.score ?? 0;
        default:
          return null;
      }
    },
  });
}

/* =====================================================
 * 3) 导出映射（CSV）
 * - 注意：必须返回 presets.key 同名字段，否则导出列会空
 * ===================================================== */

export function mapMyActivityForExport(row: MyActivityItem) {
  return {
    activityName: row.activityName,
    type: activityTypeLabel(row.type), // 转中文
    state: applicationStateLabel(row.state), // 转中文
    time: row.time,
    checkIn: boolLabel(row.checkIn), // 转中文
    checkOut: boolLabel(row.checkOut), // 转中文（undefined => "-"）
    canScore: boolLabel(canGetScore(row)), // ✅ 新增：是否加分（派生）
    getScore: boolLabel(row.getScore), // 转中文
    score: row.score,
  };
}
