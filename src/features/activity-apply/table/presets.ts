// src/features/activity-apply/table/presets.ts
import type { TableColumnPreset } from "../../../shared/components/table";
import type { EnrollTableRow } from "../types";

/**
 * 活动 / 讲座报名列表 - 列预设（唯一真相源）
 *
 * ✅ 只负责：
 * - 默认列显示/隐藏（hidden）
 * - 默认列宽（width）
 * - 列设置面板的标题（title）
 * - 导出列头（title + key）
 *
 * ❌ 不负责：
 * - sorter / filters / render（这些属于 antd columns，放到 columns.tsx）
 */
export const activityApplyTablePresets: TableColumnPreset<EnrollTableRow>[] = [
  { key: "id", title: "编号", width: 90 },

  { key: "name", title: "活动 / 讲座名称", width: 240 },
  { key: "department", title: "发布部门", width: 160 },
  { key: "type", title: "类型", width: 100 },
  { key: "state", title: "活动状态", width: 120 },

  { key: "signStartTime", title: "报名开始时间", width: 180 },
  { key: "signEndTime", title: "报名结束时间", width: 180 },

  { key: "activityStime", title: "活动开始时间", width: 180 },
  { key: "activityEtime", title: "活动结束时间", width: 180 },

  { key: "location", title: "地点", width: 160 },

  // ✅ 新增：分数/次数（后端字段就是 score）
  { key: "score", title: "分数/次数", width: 120 },

  { key: "fullNum", title: "总人数", width: 100 },
  { key: "registeredNum", title: "已报名", width: 100 },
  { key: "candidateNum", title: "候补数", width: 100 },

  { key: "applyState", title: "我的报名状态", width: 140 },

  // 操作列不进入 presets（因为不是数据字段，也不参与导出/列设置）
];
