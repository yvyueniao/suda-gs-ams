// src/features/rbac/admin/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";

import { ActionCell } from "../../../../shared/components/table";

import type { AdminMemberTableRow, Role } from "../types";
import { ROLE_LABEL } from "../types";

// ✅ 职务筛选项
const ROLE_FILTERS = Object.entries(ROLE_LABEL).map(([k, label]) => ({
  text: label,
  value: Number(k),
}));

// ✅ 账号状态筛选项（口径：invalid=true => 正常，invalid=false => 封锁）
const INVALID_FILTERS = [
  { text: "正常", value: true },
  { text: "封锁", value: false },
];

export function buildAdminMemberColumns(params: {
  onDelete: (record: AdminMemberTableRow) => void | Promise<unknown>;
  /** ✅ 部门筛选项（动态注入） */
  departmentFilters?: { text: string; value: string }[];
}): ColumnsType<AdminMemberTableRow> {
  const { onDelete, departmentFilters } = params;

  return [
    { title: "ID", dataIndex: "id", key: "id", width: 84, sorter: true },
    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      width: 140,
      sorter: true,
    },
    { title: "姓名", dataIndex: "name", key: "name", width: 120 },

    {
      title: "部门",
      dataIndex: "department",
      key: "department",
      width: 140,
      filters: departmentFilters,
    },

    {
      title: "职务",
      dataIndex: "role",
      key: "role",
      width: 110,
      sorter: true,
      filters: ROLE_FILTERS,
      render: (role: Role) => ROLE_LABEL[role] ?? "-",
    },

    {
      title: "账号状态",
      dataIndex: "invalid",
      key: "invalid",
      width: 110,
      filters: INVALID_FILTERS,
      // ✅ 口径：true => 正常，false => 封锁
      render: (invalid: boolean) =>
        invalid ? <Tag color="green">正常</Tag> : <Tag color="red">封锁</Tag>,
    },

    { title: "专业", dataIndex: "major", key: "major", width: 160 },
    { title: "年级", dataIndex: "grade", key: "grade", width: 96 },

    {
      title: "社会服务分",
      dataIndex: "serviceScore",
      key: "serviceScore",
      width: 120,
      sorter: true,
    },
    {
      title: "讲座次数",
      dataIndex: "lectureNum",
      key: "lectureNum",
      width: 110,
      sorter: true,
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 170,
      sorter: true,
    },
    {
      title: "上次登录",
      dataIndex: "lastLoginTime",
      key: "lastLoginTime",
      width: 170,
      sorter: true,
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
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
