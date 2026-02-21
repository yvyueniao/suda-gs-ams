// src/features/rbac/user/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag, Tooltip } from "antd";

import { ActionCell } from "../../../../shared/components/table";

import type { UserTableRow, Role } from "../types";
import { ROLE_LABEL } from "../types";

/**
 * ===============================
 * 筛选项
 * ===============================
 */

// 角色筛选
const ROLE_FILTERS = Object.entries(ROLE_LABEL).map(([k, label]) => ({
  text: label,
  value: Number(k),
}));

// 账号状态筛选
// ✅ 口径：invalid=true => 正常，invalid=false => 封锁
const INVALID_FILTERS = [
  { text: "正常", value: true },
  { text: "封锁", value: false },
];

export function buildUserColumns(params: {
  /** 行内解封（固定显示） */
  onUnlock: (record: UserTableRow) => void | Promise<unknown>;
  /** 行内详情 */
  onDetail: (record: UserTableRow) => void | Promise<unknown>;
}): ColumnsType<UserTableRow> {
  const { onUnlock, onDetail } = params;

  return [
    // =========================
    // 身份信息
    // =========================
    { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: true },
    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      width: 130,
      sorter: true,
    },
    { title: "姓名", dataIndex: "name", key: "name", width: 110, sorter: true },

    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 100,
      sorter: true,
      filters: ROLE_FILTERS,
      render: (role: Role) => <Tag color="blue">{ROLE_LABEL[role] ?? "-"}</Tag>,
    },

    {
      title: "账号状态",
      dataIndex: "invalid",
      key: "invalid",
      width: 100,
      filters: INVALID_FILTERS,
      render: (invalid: boolean) =>
        invalid ? <Tag color="green">正常</Tag> : <Tag color="red">封锁</Tag>,
    },

    // =========================
    // 基础信息
    // =========================
    {
      title: "年级",
      dataIndex: "grade",
      key: "grade",
      width: 90,
      sorter: true,
    },
    {
      title: "专业",
      dataIndex: "major",
      key: "major",
      width: 150,
      sorter: true,
    },
    { title: "邮箱", dataIndex: "email", key: "email", width: 180 },

    // =========================
    // 业务统计
    // =========================
    {
      title: "社会服务分",
      dataIndex: "serviceScore",
      key: "serviceScore",
      width: 120,
      sorter: true,
      align: "right",
    },
    {
      title: "讲座次数",
      dataIndex: "lectureNum",
      key: "lectureNum",
      width: 110,
      sorter: true,
      align: "right",
    },

    // =========================
    // 审计信息
    // =========================
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

    // =========================
    // 操作列（解封 + 详情）
    // =========================
    {
      title: "操作",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_: unknown, record) => {
        const isNormal = record.invalid === true; // 正常
        const isLocked = record.invalid === false; // 封锁

        return (
          <ActionCell
            record={record}
            actions={[
              {
                key: "unlock",
                label: (
                  <Tooltip
                    title={isNormal ? "该用户当前为正常状态" : "点击解封该用户"}
                  >
                    <span>解封</span>
                  </Tooltip>
                ),
                onClick: () => {
                  if (!isNormal) {
                    onUnlock(record);
                  }
                },
                disabled: isNormal, // ✅ 正常状态时灰色不可点
              },
              {
                key: "detail",
                label: "详情",
                onClick: () => onDetail(record),
              },
            ]}
          />
        );
      },
    },
  ];
}
