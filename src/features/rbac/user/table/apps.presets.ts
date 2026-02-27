// src/features/rbac/user/table/apps.presets.ts

import type { TableColumnPreset } from "../../../../shared/components/table";

/**
 * 用户详情 - 报名记录（/activity/usernameApplications）表格列预设（唯一真相源）
 *
 * 说明：
 * - 这里只定义：key / title / width / hidden
 * - render / sorter / filters 在 apps.columns.tsx 中实现
 * - 列顺序即展示顺序
 *
 * ✅ 约定（按你最新要求）：
 * - keyword 只搜索 activityName（helpers.ts 里实现）
 * - 前端分页/筛选/排序/导出/列设置/拖拽列宽：复用 shared/table 基建
 * - ✅ 新增操作列（删除特殊加分记录）
 */

export const USER_APPS_COLUMN_PRESETS: TableColumnPreset[] = [
  // =========================
  // 核心展示
  // =========================
  { key: "activityName", title: "活动名称", width: 220 },

  { key: "type", title: "类型", width: 100 },
  { key: "state", title: "报名状态", width: 120 },

  { key: "time", title: "申请时间", width: 170 },

  { key: "score", title: "分数/次数", width: 100 },

  // =========================
  // 签到/加分状态
  // =========================
  { key: "checkIn", title: "签到", width: 90 },
  { key: "checkOut", title: "签退", width: 90 },
  { key: "getScore", title: "可加分", width: 100 },

  // =========================
  // 可选信息（默认隐藏）
  // =========================
  // ✅ 报名记录 id（用于删除 /activity/deleteApply）
  // 不在表格中展示，仅用于内部逻辑
  { key: "id", title: "记录ID", width: 90, hidden: true },

  { key: "activityId", title: "活动ID", width: 90, hidden: true },
  { key: "attachment", title: "附件", width: 160, hidden: true },
  { key: "username", title: "学号", width: 130, hidden: true },

  // =========================
  // 操作列
  // =========================
  { key: "actions", title: "操作", width: 100 },
];
