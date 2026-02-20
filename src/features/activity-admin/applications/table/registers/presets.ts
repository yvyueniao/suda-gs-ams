// src/features/activity-admin/applications/table/registers/presets.ts

/**
 * Activity Admin · Registers Table Presets
 *
 * 报名人员列表列预设（/activity/activityRegisters）
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 * - 默认宽度：给出合理初始值（配合列宽拖拽 + 持久化）
 *
 * 业务约定（报名表）：
 * - 搜索：只按 name（姓名）
 * - 排序：time / name / score
 * - 筛选：state +（可选）checkIn / checkOut
 * - 导出：基于 filtered 全量结果
 *
 * 字段来源：
 * - /activity/activityRegisters
 * - 与 CandidateRow / SupplementRow 结构完全一致（统一底座 ActivityApplicationItem）
 */

import type { TableColumnPreset } from "../../../../../shared/components/table";
import type { RegisterRow } from "../../types";

export const activityAdminRegistersColumnPresets: TableColumnPreset<RegisterRow>[] =
  [
    // =============== 基础身份 ===============
    { key: "name", title: "姓名", width: 120 },
    { key: "username", title: "学号", width: 160 },

    // =============== 申请信息 ===============
    { key: "state", title: "状态", width: 120 },
    { key: "time", title: "申请时间", width: 180 },

    // =============== 计分信息 ===============
    { key: "score", title: "分数", width: 120 },

    // =============== 考勤信息 ===============
    { key: "checkIn", title: "是否签到", width: 110 },
    { key: "checkOut", title: "是否签退", width: 110 },

    // =============== 可选信息（默认隐藏） ===============
    { key: "getScore", title: "是否计入", width: 110, hidden: true },
    { key: "type", title: "类型", width: 110, hidden: true },

    // 报名一般无附件，但字段结构一致，默认隐藏
    { key: "attachment", title: "附件", width: 220, hidden: true },

    // activityId 在详情页语境下无意义，默认隐藏
    { key: "activityId", title: "活动ID", width: 100, hidden: true },
  ];
