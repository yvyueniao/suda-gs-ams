//src\features\activity-apply\table\presets.ts
import type { TableColumnPreset } from "../../../shared/components/table";
import type { EnrollTableRow } from "../types";

/**
 * 活动 / 讲座报名列表 - 列预设（唯一真相源）
 *
 * 说明：
 * - 控制列：显示 / 隐藏 / 顺序 / 默认宽度
 * - 控制导出：列头 title + key
 * - 控制列宽持久化（配合 bizKey = activityApply.enrollList 或你实际使用的 key）
 *
 * ❗任何人禁止在 columns.tsx / 页面中“偷偷新增列定义”
 */
export const activityApplyTablePresets: TableColumnPreset<EnrollTableRow>[] = [
  { key: "id", title: "编号", width: 90, sorter: true },

  { key: "name", title: "活动 / 讲座名称", width: 240, sorter: true },
  { key: "department", title: "发布部门", width: 160, sorter: true },
  {
    key: "type",
    title: "类型",
    width: 100,
    sorter: true,
    filters: [
      { text: "活动", value: 0 },
      { text: "讲座", value: 1 },
    ],
  },
  {
    key: "state",
    title: "活动状态",
    width: 120,
    sorter: true,
    filters: [
      { text: "未开始", value: 0 },
      { text: "报名中", value: 1 },
      { text: "报名结束", value: 2 },
      { text: "进行中", value: 3 },
      { text: "已结束", value: 4 },
    ],
  },

  { key: "signStartTime", title: "报名开始时间", width: 180, sorter: true },
  { key: "signEndTime", title: "报名结束时间", width: 180, sorter: true },

  { key: "activityStime", title: "活动开始时间", width: 180, sorter: true },
  { key: "activityEtime", title: "活动结束时间", width: 180, sorter: true },

  { key: "location", title: "地点", width: 160, sorter: true },

  { key: "fullNum", title: "总人数", width: 100, sorter: true },
  { key: "registeredNum", title: "已报名", width: 100, sorter: true },
  { key: "candidateNum", title: "候补数", width: 100, sorter: true },

  {
    key: "applyState",
    title: "我的报名状态",
    width: 140,
    sorter: true,
    filters: [
      { text: "未报名", value: "NOT_APPLIED" },
      { text: "报名成功", value: "APPLIED" },
      { text: "候补中", value: "CANDIDATE" },
      { text: "候补成功", value: "CANDIDATE_SUCC" },
      { text: "候补失败", value: "CANDIDATE_FAIL" },
      { text: "审核中", value: "REVIEWING" },
      { text: "审核失败", value: "REVIEW_FAIL" },
    ],
  },

  // 操作列一般不是后端字段，但 EnrollTableRow 里也没有 action
  // ✅ 推荐：如果你们列系统允许“UI 虚拟列”，就把 TableColumnPreset 的 key 类型放宽（见下方方案）
  // 这里先按“类型严格”给出：不要在 presets 里声明 action
];
