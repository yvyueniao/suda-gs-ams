// src/features/activity-admin/applications/table/candidates/columns.tsx

/**
 * Activity Admin · Candidates Table Columns
 *
 * 候补人员列表（/activity/activityCandidates）
 *
 * 设计约定：
 * - 搜索：仅按 name（在 helpers.ts 中控制）
 * - 排序：time / name（前端本地排序）
 * - 筛选：state（候补中 / 候补成功 / 候补失败）
 * - 不包含操作列
 * - 附件默认隐藏（presets 控制）
 */

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";

import type { CandidateRow, ApplicationState, ActivityType } from "../../types";

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
 * 状态颜色（候补场景重点）
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
 * 布尔值统一展示
 */
function boolLabel(v: boolean) {
  return v ? "是" : "否";
}

export function buildCandidatesColumns(): ColumnsType<CandidateRow> {
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
      sorter: false,
    },
    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      filters: [
        { text: "候补中", value: 1 },
        { text: "候补成功", value: 2 },
        { text: "候补失败", value: 3 },
      ],
      sorter: false,
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
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 110,
      sorter: false,
      render: (value: ActivityType) => typeLabel(value),
    },
    {
      title: "分数",
      dataIndex: "score",
      key: "score",
      width: 120,
      sorter: false,
    },
    {
      title: "是否签到",
      dataIndex: "checkIn",
      key: "checkIn",
      width: 110,
      sorter: false,
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "是否签退",
      dataIndex: "checkOut",
      key: "checkOut",
      width: 110,
      sorter: false,
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "是否计入",
      dataIndex: "getScore",
      key: "getScore",
      width: 110,
      sorter: false,
      render: (v: boolean) => boolLabel(v),
    },
    {
      title: "附件",
      dataIndex: "attachment",
      key: "attachment",
      width: 220,
      sorter: false,
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
      sorter: false,
    },
  ];
}
