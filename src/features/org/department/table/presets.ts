// src/features/org/department/table/presets.ts

/**
 * Department Table Presets
 *
 * 列预设唯一真相源：
 * - 默认显示：hidden !== true（不写 hidden 即显示）
 * - 默认顺序：数组顺序
 */

import type { TableColumnPreset } from "../../../../shared/components/table";
import type { DepartmentItem } from "../types";

export const departmentColumnPresets: TableColumnPreset<DepartmentItem>[] = [
  {
    key: "id",
    title: "部门ID",
    width: 96,
    hidden: true,
  },
  {
    key: "department",
    title: "部门名称",
    width: 220,
  },
];
