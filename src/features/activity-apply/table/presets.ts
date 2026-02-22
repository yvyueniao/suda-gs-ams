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
 *
 * ✅ 本次修改：
 * - 原“已报名（registeredNum）”改为“成功申请（successApplyNum）”
 * - successApplyNum = 报名成功人数 + 候补成功人数
 *
 * ⚠️ 注意：
 * - 若你修改了 key（registeredNum → successApplyNum）
 *   记得在 useEnrollTable 中将 columnPrefs version +1
 */
export const activityApplyTablePresets: TableColumnPreset<EnrollTableRow>[] = [
  { key: "id", title: "编号", width: 90, hidden: true },

  { key: "name", title: "名称", width: 240 },
  { key: "department", title: "发布部门", width: 160 },
  { key: "type", title: "类型", width: 100 },
  { key: "state", title: "活动状态", width: 120 },

  { key: "signStartTime", title: "报名开始时间", width: 180 },
  { key: "signEndTime", title: "报名结束时间", width: 180 },

  { key: "activityStime", title: "活动开始时间", width: 180 },
  { key: "activityEtime", title: "活动结束时间", width: 180 },

  { key: "location", title: "地点", width: 160 },

  // 分数/次数
  { key: "score", title: "分数/次数", width: 120 },

  { key: "fullNum", title: "总人数", width: 100 },

  // ✅ 修改：成功申请 = 报名成功 + 候补成功
  { key: "successApplyNum", title: "成功申请", width: 120 },

  { key: "candidateNum", title: "候补数", width: 100 },

  { key: "applyState", title: "我的报名状态", width: 140 },

  // 操作列不进入 presets（因为不是数据字段，也不参与导出/列设置）
];
