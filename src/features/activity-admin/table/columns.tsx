// src/features/activity-admin/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";
import { ActionCell } from "../../../shared/components/table";
import { Can } from "../../../shared/components/guard/Can";

import type { ManageableActivityItem } from "../types";
import type { ActivityType, ActivityState } from "../types";

type BuildColumnsParams = {
  onEdit: (record: ManageableActivityItem) => void;
  onDelete: (record: ManageableActivityItem) => void;
  onDetail: (record: ManageableActivityItem) => void;
  isDeleting?: (id: number) => boolean;
};

function typeLabel(type: ActivityType) {
  return type === 0 ? "活动" : "讲座";
}

function stateLabel(state: ActivityState) {
  const map: Record<ActivityState, string> = {
    0: "未开始",
    1: "报名中",
    2: "报名结束",
    3: "进行中",
    4: "已结束",
  };
  return map[state];
}

function stateColor(state: ActivityState) {
  const map: Record<ActivityState, string> = {
    0: "default",
    1: "blue",
    2: "orange",
    3: "green",
    4: "red",
  };
  return map[state];
}

export function buildActivityAdminColumns(
  params: BuildColumnsParams,
): ColumnsType<ManageableActivityItem> {
  const { onEdit, onDelete, onDetail, isDeleting } = params;

  return [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: true,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 220,
      sorter: true,
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
      render: (value: ActivityType) => (
        <Tag color={value === 0 ? "blue" : "purple"}>{typeLabel(value)}</Tag>
      ),
    },
    {
      title: "活动状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      filters: [
        { text: "未开始", value: 0 },
        { text: "报名中", value: 1 },
        { text: "报名结束", value: 2 },
        { text: "进行中", value: 3 },
        { text: "已结束", value: 4 },
      ],
      sorter: true,
      render: (value: ActivityState) => (
        <Tag color={stateColor(value)}>{stateLabel(value)}</Tag>
      ),
    },
    {
      title: "发布部门",
      dataIndex: "department",
      key: "department",
      width: 140,
      sorter: true,
    },
    {
      title: "地点",
      dataIndex: "location",
      key: "location",
      width: 160,
    },
    {
      title: "分数/次数",
      dataIndex: "score",
      key: "score",
      width: 100,
      sorter: true,
    },
    {
      title: "创建时间",
      dataIndex: "time",
      key: "time",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "报名开始时间",
      dataIndex: "signStartTime",
      key: "signStartTime",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "报名截止时间",
      dataIndex: "signEndTime",
      key: "signEndTime",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "活动开始时间",
      dataIndex: "activityStime",
      key: "activityStime",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "活动结束时间",
      dataIndex: "activityEtime",
      key: "activityEtime",
      width: 180,
      sorter: true,
      render: (v: string) => v,
    },
    {
      title: "总人数",
      dataIndex: "fullNum",
      key: "fullNum",
      width: 120,
      sorter: true,
    },
    {
      title: "已报名",
      dataIndex: "registeredNum",
      key: "registeredNum",
      width: 120,
      sorter: true,
    },
    {
      title: "候补人数",
      dataIndex: "candidateNum",
      key: "candidateNum",
      width: 120,
      sorter: true,
    },
    {
      title: "候补成功",
      dataIndex: "candidateSuccNum",
      key: "candidateSuccNum",
      width: 120,
    },
    {
      title: "候补失败",
      dataIndex: "candidateFailNum",
      key: "candidateFailNum",
      width: 120,
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_: unknown, record: ManageableActivityItem) => (
        <ActionCell
          record={record}
          actions={[
            {
              key: "detail",
              label: "详情",
              onClick: () => onDetail(record),
            },
            {
              key: "edit",
              label: "修改",
              onClick: () => onEdit(record),
            },
            {
              key: "delete",
              label: <Can roles={[0, 1, 2]}>删除</Can>,
              danger: true,
              loading: isDeleting?.(record.id),
              confirm: {
                title: "确认删除该活动？",
                content: `名称：${record.name}`,
                okText: "删除",
                cancelText: "取消",
              },
              onClick: () => onDelete(record),
            },
          ]}
        />
      ),
    },
  ];
}
