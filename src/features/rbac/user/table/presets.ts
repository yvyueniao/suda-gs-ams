// src/features/rbac/user/table/presets.ts

import type { TableColumnPreset } from "../../../../shared/components/table";

/**
 * 用户管理表 - 列预设（唯一真相源）
 *
 * 说明：
 * - 这里只定义：key / title / width / hidden
 * - render / sorter / filters 在 columns.tsx 中实现
 * - 列顺序即展示顺序
 */

export const USER_COLUMN_PRESETS: TableColumnPreset[] = [
  // =========================
  // 身份信息
  // =========================
  // ✅ ID 不展示，但作为内部唯一标识保留
  { key: "id", title: "ID", width: 80, hidden: true },

  { key: "username", title: "学号", width: 130 },
  { key: "name", title: "姓名", width: 110 },

  { key: "role", title: "角色", width: 100 },
  { key: "invalid", title: "账号状态", width: 100 },

  // =========================
  // 基础信息
  // =========================
  { key: "grade", title: "年级", width: 90 },
  { key: "major", title: "专业", width: 150 },
  { key: "email", title: "邮箱", width: 180 },

  // =========================
  // 业务统计
  // =========================
  { key: "serviceScore", title: "社会服务分", width: 120 },
  { key: "lectureNum", title: "讲座次数", width: 110 },

  // =========================
  // 审计信息
  // =========================
  { key: "createTime", title: "创建时间", width: 170 },
  { key: "lastLoginTime", title: "上次登录", width: 170 },

  // =========================
  // 操作列（固定在最右侧）
  // =========================
  { key: "actions", title: "操作", width: 160 },
];
