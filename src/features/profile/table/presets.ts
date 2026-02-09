// src/features/profile/table/presets.ts
import type { TableColumnPreset } from "../../../shared/components/table";
import type { MyActivityItem } from "../types";

/**
 * 我的活动 / 讲座报名记录 - 列预设（唯一真相源）
 *
 * 说明：
 * - 控制列：显示 / 隐藏 / 顺序 / 默认宽度
 * - 控制导出：列头 title + key
 * - 控制列宽持久化（配合 bizKey = profile.myActivities）
 *
 * ❗任何人禁止在 columns.tsx / 页面中“偷偷新增列定义”
 */
export const myActivitiesTablePresets: TableColumnPreset<MyActivityItem>[] = [
  {
    key: "activityName",
    title: "活动 / 讲座名称",
    width: 220,
  },
  {
    key: "type",
    title: "类型",
    width: 100,
  },
  {
    key: "state",
    title: "报名状态",
    width: 120,
  },
  {
    key: "time",
    title: "报名时间",
    width: 180,
  },
  {
    key: "checkIn",
    title: "签到",
    width: 100,
  },
  {
    key: "checkOut",
    title: "签退",
    width: 100,
    hidden: true, // 默认隐藏，进列设置可打开
  },
  {
    key: "getScore",
    title: "可加分",
    width: 120,
  },
  {
    key: "score",
    title: "分数",
    width: 80,
  },
  {
    key: "actions",
    title: "操作",
    width: 120,
  },
];
