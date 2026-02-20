// src/features/activity-admin/applications/table/supplements/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Space, Tag, Typography } from "antd";

import { ActionCell } from "../../../../../shared/components/table";
import { Can } from "../../../../../shared/components/guard/Can";

import type {
  SupplementRow,
  ApplicationState,
  ActivityType,
} from "../../types";

const { Link, Text } = Typography;

export type BuildSupplementsColumnsParams = {
  /** 审核通过 */
  onApprove: (row: SupplementRow) => void | Promise<unknown>;

  /** 审核不通过 */
  onReject: (row: SupplementRow) => void | Promise<unknown>;

  /** 行级 loading：按 username 维度 */
  isAuditing?: (username: string) => boolean;
};

function typeLabel(type: ActivityType) {
  return type === 0 ? "活动" : "讲座";
}

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

function stateColor(state: ApplicationState) {
  // 这里随便给一套稳定配色即可（不影响逻辑）
  const map: Record<ApplicationState, string> = {
    0: "green",
    1: "blue",
    2: "green",
    3: "red",
    4: "orange",
    5: "red",
  };
  return map[state];
}

function boolText(v: boolean) {
  return v ? "是" : "否";
}

function openPreview(url: string) {
  // 你已确认：链接无需 token，可直接访问
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildSupplementsColumns(
  params: BuildSupplementsColumnsParams,
): ColumnsType<SupplementRow> {
  const { onApprove, onReject, isAuditing } = params;

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
      sorter: true,
    },
    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      filters: [
        { text: "审核中", value: 4 },
        { text: "审核失败", value: 5 },
      ],
      sorter: true,
      render: (v: ApplicationState) => (
        <Tag color={stateColor(v)}>{stateLabel(v)}</Tag>
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
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      sorter: true,
      render: (v: ActivityType) => <Tag>{typeLabel(v)}</Tag>,
    },
    {
      title: "分数/次数",
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
        { text: "已签到", value: 1 },
        { text: "未签到", value: 0 },
      ],
      sorter: true,
      render: (v: boolean) => boolText(v),
    },
    {
      title: "是否签退",
      dataIndex: "checkOut",
      key: "checkOut",
      width: 110,
      filters: [
        { text: "已签退", value: 1 },
        { text: "未签退", value: 0 },
      ],
      sorter: true,
      render: (v: boolean) => boolText(v),
    },
    {
      title: "是否计入",
      dataIndex: "getScore",
      key: "getScore",
      width: 110,
      filters: [
        { text: "计入", value: 1 },
        { text: "不计入", value: 0 },
      ],
      sorter: true,
      render: (v: boolean) => boolText(v),
    },
    {
      title: "证明材料",
      dataIndex: "attachment",
      key: "attachment",
      width: 220,
      render: (url: string | null) => {
        if (!url) return <Text type="secondary">-</Text>;
        return (
          <Link onClick={() => openPreview(url)} title="新标签页预览">
            证明材料
          </Link>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_: unknown, record: SupplementRow) => {
        // ✅ 显式类型，避免 username any
        const username: string = record.username;

        const loading = isAuditing?.(username) ?? false;

        return (
          <ActionCell
            record={record}
            actions={[
              {
                key: "approve",
                label: <Can roles={[0, 1, 2]}>通过</Can>,
                loading,
                confirm: {
                  title: "确认通过该补报名申请？",
                  content: (
                    <Space direction="vertical" size={2}>
                      <span>姓名：{record.name}</span>
                      <span>学号：{record.username}</span>
                    </Space>
                  ),
                  okText: "通过",
                  cancelText: "取消",
                },
                onClick: () => onApprove(record),
              },
              {
                key: "reject",
                label: <Can roles={[0, 1, 2]}>不通过</Can>,
                danger: true,
                loading,
                confirm: {
                  title: "确认不通过该补报名申请？",
                  content: (
                    <Space direction="vertical" size={2}>
                      <span>姓名：{record.name}</span>
                      <span>学号：{record.username}</span>
                    </Space>
                  ),
                  okText: "不通过",
                  cancelText: "取消",
                },
                onClick: () => onReject(record),
              },
            ]}
            maxVisible={2}
          />
        );
      },
    },
  ];
}
