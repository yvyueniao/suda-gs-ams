// src/features/feedback/table/presets.ts

import type { TableColumnPreset } from "../../../shared/components/table";
import type { FeedbackSessionItem } from "../types";

/**
 * 反馈列表 - 列预设（唯一真相源）
 *
 * 只负责：
 * - 默认列顺序
 * - 默认列宽
 * - 默认显示/隐藏（hidden）
 *
 * 不负责：
 * - render
 * - sorter
 * - filters
 *
 * 操作列不进入 presets
 */

/* =========================================================
 * 普通用户：我的反馈（mine）
 * ========================================================= */

export const feedbackMineTablePresets: TableColumnPreset<FeedbackSessionItem>[] =
  [
    { key: "title", title: "反馈标题", width: 320 },

    { key: "state", title: "状态", width: 120 },

    { key: "time", title: "创建时间", width: 180 },

    // 默认隐藏
    { key: "sessionId", title: "反馈ID", width: 240, hidden: true },

    // mine 不展示
    { key: "name", title: "姓名", width: 120, hidden: true },
    { key: "username", title: "用户名", width: 150, hidden: true },
  ];

/* =========================================================
 * 管理员：全部反馈（all）
 * ========================================================= */

export const feedbackAllTablePresets: TableColumnPreset<FeedbackSessionItem>[] =
  [
    { key: "title", title: "反馈标题", width: 280 },

    { key: "name", title: "姓名", width: 120 },

    { key: "username", title: "用户名", width: 150 },

    { key: "state", title: "状态", width: 120 },

    { key: "time", title: "创建时间", width: 180 },

    // 默认隐藏
    { key: "sessionId", title: "反馈ID", width: 240, hidden: true },
  ];
