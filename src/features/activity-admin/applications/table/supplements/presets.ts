// src/features/activity-admin/applications/table/supplements/presets.ts

/**
 * Activity Admin · Supplements Table Presets
 *
 * 补报名人员列表列预设（/activity/activitySupplements）
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 * - 默认宽度：给出合理初始值（配合列宽拖拽 + 持久化）
 *
 * 业务约定（补报名表）：
 * - 搜索：只按 name（姓名）
 * - 排序：state / time / name
 * - 筛选：state（4:审核中 / 5:审核失败）
 * - 必须包含：
 *    - 证明材料（attachment）
 *    - 操作列（通过 / 不通过，带二次确认）
 * - activityId 在详情页语境下无意义，默认隐藏
 */

import type { TableColumnPreset } from "../../../../../shared/components/table";
import type { SupplementRow } from "../../types";

export const activityAdminSupplementsColumnPresets: TableColumnPreset<SupplementRow>[] =
  [
    // =============== 基础身份 ===============
    { key: "name", title: "姓名", width: 120 },
    { key: "username", title: "学号", width: 160 },

    // =============== 审核信息 ===============
    { key: "state", title: "状态", width: 120 },
    { key: "time", title: "申请时间", width: 180 },

    // =============== 材料 ===============
    // 你已确认：点击直接新标签页预览（无需 token）
    { key: "attachment", title: "证明材料", width: 220 },

    // =============== 分数信息 ===============
    { key: "score", title: "分数", width: 120 },

    // =============== 可选信息（默认隐藏） ===============
    { key: "type", title: "类型", width: 110, hidden: true },
    { key: "checkIn", title: "是否签到", width: 110, hidden: true },
    { key: "checkOut", title: "是否签退", width: 110, hidden: true },
    { key: "getScore", title: "是否计入", width: 110, hidden: true },

    // =============== 操作列 ===============
    // 注意：操作列通常放在最后，方便固定到右侧
    { key: "actions", title: "操作", width: 180 },

    // =============== 辅助列（默认隐藏） ===============
    { key: "activityId", title: "活动ID", width: 100, hidden: true },
  ];
