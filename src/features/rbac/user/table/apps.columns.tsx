// src/features/rbac/user/table/apps.columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag, Typography } from "antd";

import type { UsernameApplicationItem } from "../types";

const { Link, Text } = Typography;

/**
 * 用户详情 - 报名记录表 columns 工厂
 *
 * ✅ 关键修复（你现在遇到的 TS 报错根因）：
 * - 不要在 columns 里自造 UserApplicationRow 类型
 * - 直接以后端接口类型 UsernameApplicationItem 作为表格行类型（唯一真相源）
 *
 * ✅ 所有带筛选字段均使用语义颜色 Tag
 * ✅ keyword 只搜索 activityName（在 apps.helpers.ts 中实现）
 */

/* ===============================
   枚举映射
================================ */

const TYPE_LABEL: Record<number, string> = {
  0: "活动",
  1: "讲座",
};

const STATE_LABEL: Record<number, string> = {
  0: "报名成功",
  1: "候补中",
  2: "候补成功",
  3: "候补失败",
  4: "审核中",
  5: "审核失败",
};

/* ===============================
   语义颜色映射
================================ */

// 类型：活动=蓝色，讲座=紫色
function renderType(type: number) {
  const color = type === 0 ? "blue" : "purple";
  return <Tag color={color}>{TYPE_LABEL[type] ?? String(type)}</Tag>;
}

// 状态：成功=绿色，失败=红色，中间态=橙/金色
function renderState(state: number) {
  let color: string = "default";

  switch (state) {
    case 0: // 报名成功
    case 2: // 候补成功
      color = "green";
      break;
    case 3: // 候补失败
    case 5: // 审核失败
      color = "red";
      break;
    case 1: // 候补中
      color = "orange";
      break;
    case 4: // 审核中
      color = "gold";
      break;
  }

  return <Tag color={color}>{STATE_LABEL[state] ?? String(state)}</Tag>;
}

// 布尔类：是=绿色，否=红色
function renderBool(v: boolean) {
  return v ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>;
}

/* ===============================
   Filters
================================ */

const TYPE_FILTERS = Object.entries(TYPE_LABEL).map(([k, label]) => ({
  text: label,
  value: Number(k),
}));

const STATE_FILTERS = Object.entries(STATE_LABEL).map(([k, label]) => ({
  text: label,
  value: Number(k),
}));

const BOOL_FILTERS = [
  { text: "是", value: true },
  { text: "否", value: false },
];

/* ===============================
   Columns Factory
================================ */

export function buildUserAppsColumns(): ColumnsType<UsernameApplicationItem> {
  return [
    {
      title: "活动名称",
      dataIndex: "activityName",
      key: "activityName",
      ellipsis: true,
      render: (val: unknown) => <Text>{String(val ?? "-")}</Text>,
    },

    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      filters: TYPE_FILTERS,
      render: (val: unknown) => renderType(Number(val ?? 0)),
    },

    {
      title: "报名状态",
      dataIndex: "state",
      key: "state",
      filters: STATE_FILTERS,
      render: (val: unknown) => renderState(Number(val ?? 0)),
    },

    {
      title: "申请时间",
      dataIndex: "time",
      key: "time",
      sorter: true,
      render: (val: unknown) => <Text>{String(val ?? "-")}</Text>,
    },

    {
      title: "分数/次数",
      dataIndex: "score",
      key: "score",
      align: "right",
      sorter: true,
      render: (val: unknown) =>
        typeof val === "number" ? <Text strong>{val}</Text> : <Text>-</Text>,
    },

    {
      title: "签到",
      dataIndex: "checkIn",
      key: "checkIn",
      filters: BOOL_FILTERS,
      render: (val: unknown) => renderBool(!!val),
    },

    {
      title: "签退",
      dataIndex: "checkOut",
      key: "checkOut",
      filters: BOOL_FILTERS,
      render: (val: unknown) => renderBool(!!val),
    },

    {
      title: "可加分",
      dataIndex: "getScore",
      key: "getScore",
      filters: BOOL_FILTERS,
      render: (val: unknown) => renderBool(!!val),
    },

    {
      title: "活动ID",
      dataIndex: "activityId",
      key: "activityId",
      sorter: true,
      render: (val: unknown) => (val ?? "-") as any,
    },

    {
      title: "附件",
      dataIndex: "attachment",
      key: "attachment",
      render: (val: unknown) =>
        typeof val === "string" && val.trim() ? (
          <Link href={val} target="_blank" rel="noreferrer">
            查看附件
          </Link>
        ) : (
          "-"
        ),
    },

    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      render: (val: unknown) => String(val ?? "-"),
    },
  ];
}
