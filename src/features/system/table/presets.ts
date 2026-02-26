// src/features/system/table/presets.ts

/**
 * System Logs Table Presets
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 *
 * 设计原则：
 * - 核心审计字段默认展示
 * - 长文本字段默认隐藏（content）
 */

import type { TableColumnPreset } from "../../../shared/components/table";
import type { SystemLogItem } from "../types";

export const systemLogColumnPresets: TableColumnPreset<SystemLogItem>[] = [
  {
    key: "time",
    title: "操作时间",
    width: 180,
  },
  {
    key: "username",
    title: "用户名",
    width: 140,
  },
  {
    key: "name",
    title: "姓名",
    width: 120,
  },
  {
    key: "path",
    title: "请求路径",
    width: 240,
  },
  {
    key: "ip",
    title: "IP 地址",
    width: 150,
  },
  {
    key: "address",
    title: "IP 归属地",
    width: 200,
  },
  {
    key: "content",
    title: "请求内容",
    width: 320,
  },
];
