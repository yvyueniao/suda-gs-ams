// src/features/rbac/admin/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";

import { ActionCell } from "../../../../shared/components/table";

import type { AdminMemberTableRow, Role } from "../types";
import { ROLE_LABEL } from "../types";

/**
 * ✅ 职务筛选项
 * 过滤掉普通学生（role=4）
 */
const ROLE_FILTERS = Object.entries(ROLE_LABEL)
  .filter(([k]) => Number(k) !== 4) // ❌ 去掉普通学生
  .map(([k, label]) => ({
    text: label,
    value: Number(k),
  }));

// ✅ 账号状态筛选项
const INVALID_FILTERS = [
  { text: "正常", value: true },
  { text: "封锁", value: false },
];

/**
 * ✅ 职务语义颜色映射
 * role：
 * 0=管理员
 * 1=主席
 * 2=部长
 * 3=干事
 * 4=普通学生
 */
function getRoleTagColor(role: Role): string {
  switch (role) {
    case 0:
      return "gold"; // 管理员
    case 1:
      return "red"; // 主席
    case 2:
      return "purple"; // 部长
    case 3:
      return "cyan"; // 干事
    case 4:
      return "blue"; // 普通学生（你指定蓝色）
    default:
      return "blue";
  }
}

export function buildAdminMemberColumns(params: {
  onDelete: (record: AdminMemberTableRow) => void | Promise<unknown>;
  departmentFilters?: { text: string; value: string }[];
}): ColumnsType<AdminMemberTableRow> {
  const { onDelete, departmentFilters } = params;

  return [
    { title: "ID", dataIndex: "id", key: "id", sorter: true },

    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      sorter: true,
    },

    { title: "姓名", dataIndex: "name", key: "name" },

    {
      title: "部门",
      dataIndex: "department",
      key: "department",
      filters: departmentFilters,
    },

    {
      title: "职务",
      dataIndex: "role",
      key: "role",
      sorter: true,
      filters: ROLE_FILTERS, // ✅ 普通学生不在筛选项里
      render: (role: Role) => (
        <Tag color={getRoleTagColor(role)}>{ROLE_LABEL[role] ?? "-"}</Tag>
      ),
    },

    {
      title: "账号状态",
      dataIndex: "invalid",
      key: "invalid",
      filters: INVALID_FILTERS,
      render: (invalid: boolean) =>
        invalid ? <Tag color="green">正常</Tag> : <Tag color="red">封锁</Tag>,
    },

    { title: "专业", dataIndex: "major", key: "major" },
    { title: "年级", dataIndex: "grade", key: "grade" },

    {
      title: "社会服务分",
      dataIndex: "serviceScore",
      key: "serviceScore",
      sorter: true,
    },
    {
      title: "讲座次数",
      dataIndex: "lectureNum",
      key: "lectureNum",
      sorter: true,
    },

    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      sorter: true,
    },
    {
      title: "上次登录",
      dataIndex: "lastLoginTime",
      key: "lastLoginTime",
      sorter: true,
    },

    {
      title: "操作",
      key: "actions",
      fixed: "right",
      render: (_: unknown, record) => (
        <ActionCell
          record={record}
          actions={[
            {
              key: "delete",
              label: "删除",
              danger: true,
              onClick: () => onDelete(record),
              confirm: {
                title: "确认删除该成员？",
                content: `将从部门成员中移除：${record.name}（${record.username}）`,
                okText: "删除",
                cancelText: "取消",
              },
            },
          ]}
        />
      ),
    },
  ];
}
