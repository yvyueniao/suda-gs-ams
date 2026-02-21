// src/features/activity-admin/table/presets.ts

/**
 * Activity Admin Table Presets
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 * - 默认宽度：尽量给出可用的初始值（配合列宽拖拽/持久化）
 *
 * 需求约定（你已明确）：
 * - 列表展示除 description 外的全部字段
 * - 必须展示 id
 * - 人数不合并：fullNum / registeredNum / candidateNum / candidateSuccNum / candidateFailNum 分列展示
 * - 搜索 keyword 只匹配 name（由 helpers.ts 控制）
 * - 筛选仅 type/state（由 columns/helpers 控制）
 */

import type { TableColumnPreset } from "../../../shared/components/table";
import type { ManageableActivityItem } from "../types";

export const activityAdminColumnPresets: TableColumnPreset<ManageableActivityItem>[] =
  [
    // =============== 基础信息 ===============
    { key: "id", title: "ID", width: 80 },
    { key: "name", title: "名称", width: 220 },
    { key: "type", title: "类型", width: 110 },
    { key: "state", title: "活动状态", width: 120 },
    { key: "department", title: "发布部门", width: 140 },
    { key: "location", title: "地点", width: 160 },
    { key: "score", title: "分数/次数", width: 100 },
    { key: "time", title: "创建时间", width: 180 },

    // =============== 报名时间 ===============
    { key: "signStartTime", title: "报名开始时间", width: 180 },
    { key: "signEndTime", title: "报名截止时间", width: 180 },

    // =============== 活动时间 ===============
    { key: "activityStime", title: "活动开始时间", width: 180 },
    { key: "activityEtime", title: "活动结束时间", width: 180 },

    // =============== 人数统计（分列） ===============
    { key: "fullNum", title: "总人数", width: 120 },
    { key: "registeredNum", title: "已报名", width: 120 },
    { key: "candidateNum", title: "候补人数", width: 120 },
    { key: "candidateSuccNum", title: "候补成功", width: 120 },
    { key: "candidateFailNum", title: "候补失败", width: 120 },

    // =============== 操作列（不参与导出/列设置时也可保留） ===============
    // 说明：ActionCell 的列通常也会进 presets，方便 ColumnSettings 控制是否固定展示
    // 若你希望操作列永远固定展示，可在 ColumnSettings 中强制包含或在 UI 层禁用隐藏该列。
    { key: "actions", title: "操作", width: 180 },
  ];
