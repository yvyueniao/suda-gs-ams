// src/features/profile/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag, Typography } from "antd";

import { ActionCell } from "../../../shared/components/table";

import type { MyActivityItem } from "../types";
import { activityTypeLabel, applicationStateLabel, boolLabel } from "./helpers";

const { Text } = Typography;

/* =====================================================
 * 颜色映射（统一语义）
 * ===================================================== */

function activityTypeMeta(type: MyActivityItem["type"]) {
  return type === 0
    ? { label: activityTypeLabel(type), color: "blue" }
    : { label: activityTypeLabel(type), color: "purple" };
}

function applyStateMeta(state: MyActivityItem["state"]) {
  const label = applicationStateLabel(state);

  const colorMap: Record<number, string> = {
    0: "success", // 报名成功
    1: "processing", // 候补中
    2: "success", // 候补成功
    3: "error", // 候补失败
  };

  return {
    label,
    color: colorMap[state ?? -1] ?? "default",
  };
}

function boolMeta(v: boolean | undefined) {
  return v
    ? { label: boolLabel(v), color: "success" }
    : { label: boolLabel(v), color: "default" };
}

/* =====================================================
 * 列工厂
 * ===================================================== */

export type MyActivitiesActions = {
  openDetail: (activityId: number) => void | Promise<void>;
};

export function buildMyActivitiesColumns(
  actions: MyActivitiesActions,
): ColumnsType<MyActivityItem> {
  const columns: ColumnsType<MyActivityItem> = [
    {
      dataIndex: "activityName",
      title: "活动 / 讲座名称",
      ellipsis: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      dataIndex: "type",
      title: "类型",
      width: 100,
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      render: (v) => {
        const meta = activityTypeMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "state",
      title: "报名状态",
      width: 120,
      filters: [
        { text: "报名成功", value: 0 },
        { text: "候补中", value: 1 },
        { text: "候补成功", value: 2 },
        { text: "候补失败", value: 3 },
      ],
      render: (v) => {
        const meta = applyStateMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "time",
      title: "报名时间",
      width: 180,
      sorter: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      dataIndex: "checkIn",
      title: "签到",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v) => {
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "checkOut",
      title: "签退",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v) => {
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "getScore",
      title: "可加分",
      width: 120,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v) => {
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "score",
      title: "分数",
      width: 80,
      sorter: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      key: "actions",
      title: "操作",
      width: 120,
      fixed: "right",
      render: (_: unknown, record) => (
        <ActionCell
          record={record}
          maxVisible={2}
          actions={[
            {
              key: "detail",
              label: "详情",
              onClick: (r) => actions.openDetail(r.activityId),
            },
          ]}
        />
      ),
    },
  ];

  return columns;
}
