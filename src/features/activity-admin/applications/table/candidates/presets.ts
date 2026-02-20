// src/features/activity-admin/applications/table/candidates/presets.ts

/**
 * Activity Admin · Candidates Table Presets
 *
 * 候补人员列表列预设（/activity/activityCandidates）
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 * - 默认宽度：给出可用的初始值（配合列宽拖拽/持久化）
 *
 * 业务约定（候补表）：
 * - 搜索：只按 name（姓名）匹配（由 helpers.ts 控制）
 * - 筛选：建议仅 state（候补中/候补失败/候补成功 如后端会返回）+ 可选 checkIn/checkOut
 * - 排序：建议 time / name / score（由 helpers.ts 控制）
 * - 导出：基于 filtered 全量（由 useLocalExport 基于 local.filtered）
 *
 * 字段对齐后端：
 * - activityId / username / name / state / time / attachment / checkIn / getScore / type / score / checkOut
 */

import type { TableColumnPreset } from "../../../../../shared/components/table";
import type { CandidateRow } from "../../types";

export const activityAdminCandidatesColumnPresets: TableColumnPreset<CandidateRow>[] =
  [
    // =============== 基础身份 ===============
    { key: "name", title: "姓名", width: 120 },
    { key: "username", title: "学号", width: 160 },

    // =============== 申请信息 ===============
    { key: "state", title: "状态", width: 120 },
    { key: "time", title: "申请时间", width: 180 },

    // =============== 业务信息（可选显示） ===============
    // 说明：候补列表里 type/score 往往也有意义（比如讲座次数/分数），但优先级不如“身份+状态+时间”
    { key: "type", title: "类型", width: 110, hidden: true },
    { key: "score", title: "分数/次数", width: 120, hidden: true },

    // =============== 考勤/计分（可选显示） ===============
    { key: "checkIn", title: "是否签到", width: 110, hidden: true },
    { key: "checkOut", title: "是否签退", width: 110, hidden: true },
    { key: "getScore", title: "是否计入", width: 110, hidden: true },

    // =============== 附件（一般为 null，默认隐藏） ===============
    // 备注：候补通常不会有附件（attachment 多为 null），默认隐藏，必要时用户可在列设置中打开
    { key: "attachment", title: "附件", width: 220, hidden: true },

    // =============== 辅助列（默认隐藏） ===============
    // activityId 对用户意义不大，默认隐藏；如你希望管理端必须看到，可把 hidden 去掉
    { key: "activityId", title: "活动ID", width: 100, hidden: true },
  ];
