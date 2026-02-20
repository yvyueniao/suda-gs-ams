// src/features/activity-admin/applications/table/registers/columns.tsx

/**
 * Activity Admin · Registers Table Columns
 *
 * 报名人员列表（/activity/activityRegisters）
 *
 * 设计约定：
 * - 搜索：仅按 name（helpers.ts 控制）
 * - 排序：time / name / score（前端本地排序）
 * - 筛选：state +（可选）checkIn / checkOut
 * - 不包含操作列
 */

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";

import type { RegisterRow, ApplicationState, ActivityType } from "../../types";

/**
 * 状态文案
 */
function stateLabel(state: ApplicationState) {
  const map: Record<ApplicationState, string> = {
    0: "报名成功",
    1: "候补中",
    2: "候补成功",
    3: "候补失败",
    4: "审核中",
    5: "审核失败",
  };
  return map[state] ?? "-";
}

/**
 * 状态颜色
 */
function stateColor(state: ApplicationState) {
  const map: Record<ApplicationState, string> = {
    0: "green",
    1: "blue",
    2: "green",
    3: "red",
    4: "orange",
    5: "red",
  };
  return map[state] ?? "default";
}

/**
 * 类型文案
 */
function typeLabel(type: ActivityType) {
  return type === 0 ? "活动" : "讲座";
}

/**
 * 布尔统一展示
 */
function boolLabel(v: boolean) {
  return v ? "是" : "否";
}

export function buildRegistersColumns(): ColumnsType<RegisterRow> {
  return [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 120,
      sorter: true,
    },
    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      width: 160,
    },
    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      filters: [
        { text: "报名成功", value: 0 },
        { text: "候补成功", value: 2 },
      ],
      render: (value: ApplicationState) => (
        <Tag color={stateColor(value)}>{stateLabel(value)}</Tag>
      ),
    },
    {
      title: "申请时间",
      dataIndex: "time",
      key: "time",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "分数",
      dataIndex: "score",
      key: "score",
      width: 120,
      sorter: true,
    },
    {
      title: "是否签到",
      dataIndex: "checkIn",
      key: "checkIn",
      width: 110,
      filters: [
        { text: "已签到", value: true },
        { text: "未签到", value: false },
      ],
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "是否签退",
      dataIndex: "checkOut",
      key: "checkOut",
      width: 110,
      filters: [
        { text: "已签退", value: true },
        { text: "未签退", value: false },
      ],
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "是否计入",
      dataIndex: "getScore",
      key: "getScore",
      width: 110,
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (value: ActivityType) => typeLabel(value),
    },
    {
      title: "附件",
      dataIndex: "attachment",
      key: "attachment",
      width: 220,
      render: (url: string | null) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            查看附件
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "活动ID",
      dataIndex: "activityId",
      key: "activityId",
      width: 100,
    },
  ];
}
