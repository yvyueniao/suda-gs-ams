// src/features/rbac/admin/table/presets.ts

import type { TableColumnPreset } from "../../../../shared/components/table";

/**
 * 管理员成员管理表 - 列预设（唯一真相源）
 *
 * 说明：
 * - 只描述：key / title / width / hidden
 * - render / sorter / filters 在 columns.tsx
 * - email / menuPermission 不展示（不出现在 presets 中）
 */
export const ADMIN_MEMBER_COLUMN_PRESETS: TableColumnPreset[] = [
  { key: "id", title: "ID", width: 84, hidden: true },

  { key: "username", title: "学号", width: 140 },
  { key: "name", title: "姓名", width: 120 },

  { key: "department", title: "部门", width: 140 },
  { key: "role", title: "职务", width: 110 },
  { key: "invalid", title: "账号状态", width: 110 },

  { key: "major", title: "专业", width: 160 },
  { key: "grade", title: "年级", width: 96 },

  { key: "serviceScore", title: "社会服务分", width: 120 },
  { key: "lectureNum", title: "讲座次数", width: 110 },

  { key: "createTime", title: "创建时间", width: 170 },
  { key: "lastLoginTime", title: "上次登录", width: 170 },

  // 操作列
  { key: "actions", title: "操作", width: 160 },
];
