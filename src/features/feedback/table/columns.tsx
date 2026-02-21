// src/features/feedback/table/columns.tsx
//
// 反馈列表 - 表格列工厂（仅 columns 定义，不做请求/不做状态）
//
// 约定：
// - ✅ 只负责 antd columns：title / dataIndex / key / width / render / sorter / filters
// - ✅ “默认显示/隐藏/顺序/导出表头”交给 presets.ts（ColumnSettings 会按 presets + prefs 控制）
// - ✅ 操作列在这里定义（presets 不包含 actions）
// - ✅ 筛选：只在 columns 提供 filters，真正过滤逻辑在 helpers.matchFilters
// - ✅ 排序：sorter: true 只是给 antd 交互入口，真正排序逻辑在 helpers.getSortValue

import type { ColumnsType } from "antd/es/table";
import { Button, Space, Tag, Tooltip, Typography } from "antd";

import type { FeedbackSessionItem, FeedbackState } from "../types";

const { Text } = Typography;

const FEEDBACK_STATE_LABEL: Record<FeedbackState, string> = {
  0: "待受理",
  1: "处理中",
  2: "已解决",
};

function stateTag(state: FeedbackState) {
  const label = FEEDBACK_STATE_LABEL[state] ?? "-";

  // ✅ 统一：给状态 Tag 加颜色（更直观）
  // 0 待受理：default（灰）
  // 1 处理中：processing（蓝）
  // 2 已解决：success（绿）
  const color =
    state === 2 ? "success" : state === 1 ? "processing" : "default";

  return <Tag color={color}>{label}</Tag>;
}

function shortId(id?: string) {
  if (!id) return "-";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

export type BuildFeedbackColumnsParams = {
  /** 点击“详情”跳转隐藏路由（/feedback/detail/:sessionId） */
  onDetail: (record: FeedbackSessionItem) => void | Promise<unknown>;

  /**
   * 操作列宽度（可选）
   * 默认 100
   */
  actionWidth?: number;
};

export function buildFeedbackColumns(
  params: BuildFeedbackColumnsParams,
): ColumnsType<FeedbackSessionItem> {
  const { onDetail, actionWidth = 100 } = params;

  return [
    {
      title: "反馈标题",
      dataIndex: "title",
      key: "title",
      width: 320,
      render: (val: unknown) => (
        <Text ellipsis={{ tooltip: true }}>{String(val ?? "-")}</Text>
      ),
    },

    // ✅ 管理端会有 name；用户端可能为 undefined（我们兜底展示 "-")
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 120,
      render: (val: unknown) => <Text>{String(val ?? "-")}</Text>,
    },

    // ✅ 管理端你希望直接展示 username；用户端也有但默认会在 presets 里 hidden
    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      width: 150,
      render: (val: unknown) => <Text>{String(val ?? "-")}</Text>,
    },

    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      filters: [
        { text: "待受理", value: 0 },
        { text: "处理中", value: 1 },
        { text: "已解决", value: 2 },
      ],
      render: (val: unknown) => stateTag((val as FeedbackState) ?? 0),
    },

    {
      title: "创建时间",
      dataIndex: "time",
      key: "time",
      width: 180,
      sorter: true, // ✅ 交互入口；真正排序在 helpers.getSortValue
      render: (val: unknown) => <Text>{String(val ?? "-")}</Text>,
    },

    {
      title: "反馈ID",
      dataIndex: "sessionId",
      key: "sessionId",
      width: 240,
      render: (val: unknown) => {
        const id = String(val ?? "");
        const display = shortId(id);
        return (
          <Tooltip title={id || "-"}>
            <Text code>{display}</Text>
          </Tooltip>
        );
      },
    },

    // ✅ 操作列：仅“详情”（结束按钮不在列表）
    {
      title: "操作",
      key: "actions",
      width: actionWidth,
      fixed: "right",
      render: (_: unknown, record: FeedbackSessionItem) => (
        <Space size="small">
          <Button type="link" onClick={() => onDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];
}
