// src/features/profile/table/columns.tsx
import type { ColumnsType } from "antd/es/table";
import { Tag, Typography } from "antd";

import { ActionCell } from "../../../shared/components/table";

import type { MyActivityItem } from "../types";
import { activityTypeLabel, applicationStateLabel, boolLabel } from "./helpers";

const { Text } = Typography;

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
      render: (v: MyActivityItem["activityName"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
    },
    {
      dataIndex: "type",
      title: "类型",
      width: 100,
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      // 受控筛选（推荐）由“页面/Hook 编排层”把 query.filters 映射成 filteredValue
      render: (v: MyActivityItem["type"] | undefined) => {
        const label = activityTypeLabel(v);
        return <Tag>{label}</Tag>;
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
      render: (v: MyActivityItem["state"] | undefined) => {
        const label = applicationStateLabel(v);
        return <Tag>{label}</Tag>;
      },
    },
    {
      dataIndex: "time",
      title: "报名时间",
      width: 180,
      sorter: true, // SmartTable 会把 sorter 回传到 query.sorter
      render: (v: MyActivityItem["time"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
    },
    {
      dataIndex: "checkIn",
      title: "签到",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v: MyActivityItem["checkIn"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "checkOut",
      title: "签退",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      // checkOut 允许缺失：缺失时显示 "-"
      render: (v: MyActivityItem["checkOut"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "getScore",
      title: "可加分",
      width: 120,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v: MyActivityItem["getScore"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "score",
      title: "分数",
      width: 80,
      sorter: true,
      render: (v: MyActivityItem["score"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
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
              onClick: () => actions.openDetail(record.activityId),
            },
          ]}
        />
      ),
    },
  ];

  return columns;
}
