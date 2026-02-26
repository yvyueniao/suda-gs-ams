// src/features/system/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tooltip, Typography } from "antd";
import type { SystemLogItem } from "../types";

const { Text } = Typography;

type SortOrder = "ascend" | "descend" | null;

type TableSorter = {
  field?: string;
  order?: SortOrder;
} | null;

function sortOrderOf(sorter: TableSorter, field: string): SortOrder {
  if (!sorter) return null;
  return sorter.field === field ? (sorter.order ?? null) : null;
}

export function buildSystemLogColumns(params?: {
  sorter?: TableSorter;
}): ColumnsType<SystemLogItem> {
  const sorter = params?.sorter ?? null;

  return [
    {
      title: "操作时间",
      dataIndex: "time",
      key: "time",
      width: 180,
      sorter: true,
      sortOrder: sortOrderOf(sorter, "time"),
    },
    {
      title: "学号",
      dataIndex: "username",
      key: "username",
      width: 140,
      sorter: true,
      sortOrder: sortOrderOf(sorter, "username"),
    },
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 120,
      sorter: true,
      sortOrder: sortOrderOf(sorter, "name"),
    },
    {
      title: "请求路径",
      dataIndex: "path",
      key: "path",
      width: 240,
      sorter: true,
      sortOrder: sortOrderOf(sorter, "path"),
      ellipsis: true,
    },
    {
      title: "IP 地址",
      dataIndex: "ip",
      key: "ip",
      width: 150,
    },
    {
      title: "IP 归属地",
      dataIndex: "address",
      key: "address",
      width: 200,
      ellipsis: true,
    },
    {
      title: "请求内容",
      dataIndex: "content",
      key: "content",
      width: 320,
      render: (value: string) => {
        if (!value) return "-";
        return (
          <Tooltip title={value} placement="topLeft">
            <Text ellipsis style={{ maxWidth: 280 }}>
              {value}
            </Text>
          </Tooltip>
        );
      },
    },
  ];
}
