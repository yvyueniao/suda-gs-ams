// src/features/rbac/user/table/apps.columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag, Tooltip, Typography } from "antd";

import { ActionCell } from "../../../../shared/components/table";

import type { UsernameApplicationItem } from "../types";

const { Link, Text } = Typography;

/**
 * 用户详情 - 报名记录表 columns 工厂（纯 UI 列定义层）
 *
 * ✅ 关键点
 * - 行类型唯一真相源：UsernameApplicationItem（后端 /activity/usernameApplications 返回）
 * - ❌ 这里不请求接口、不写业务逻辑
 * - ✅ “删除”只触发回调，由 hook/page 决定怎么调接口、怎么 reload
 * - ✅ 二次确认：使用 ActionCell 内置 confirm（你们封装好的居中弹窗）
 *
 * ✅ 新需求
 * - 不区分是否特殊加分：所有记录都允许点删除
 * - 最终是否允许删除由后端决定（前端不做 canDelete 限制）
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
    case 0:
    case 2:
      color = "green";
      break;
    case 3:
    case 5:
      color = "red";
      break;
    case 1:
      color = "orange";
      break;
    case 4:
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

export function buildUserAppsColumns(params?: {
  /** ✅ 删除：只触发回调 */
  onDelete?: (row: UsernameApplicationItem) => void | Promise<unknown>;

  /** ✅ 是否正在删除某条记录（用于行级 loading） */
  isDeleting?: (id: number) => boolean;
}): ColumnsType<UsernameApplicationItem> {
  const onDelete = params?.onDelete;
  const isDeleting = params?.isDeleting;

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
      sorter: true,
      align: "right",
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

    // =========================
    // ✅ 操作列：删除（所有记录都允许点）
    // - 二次确认用 ActionCell.confirm（居中弹窗）
    // =========================
    {
      title: "操作",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_: unknown, row) => {
        const rowId = Number((row as any)?.id);
        const hasId = Number.isFinite(rowId);

        const disabled = !onDelete || !hasId;
        return (
          <span>
            <ActionCell
              record={row}
              actions={[
                {
                  key: "delete",
                  label: "删除",
                  danger: true,
                  disabled,
                  loading: hasId ? isDeleting?.(rowId) : false,
                  confirm: {
                    title: "确认删除该条报名记录？",
                    content: hasId
                      ? `记录ID：${rowId}${row.activityName ? `，活动：${row.activityName}` : ""}`
                      : "缺少记录ID",
                    okText: "删除",
                    cancelText: "取消",
                  },
                  onClick: () => onDelete?.(row),
                },
              ]}
            />
          </span>
        );
      },
    },
  ];
}
