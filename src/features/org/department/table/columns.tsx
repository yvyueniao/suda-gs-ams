// src/features/org/department/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { ActionCell } from "../../../../shared/components/table";
import type { DepartmentItem } from "../types";

type BuildColumnsParams = {
  onDelete: (record: DepartmentItem) => void | Promise<unknown>;
  isDeleting?: (id: number) => boolean;
};

export function buildDepartmentColumns(
  params: BuildColumnsParams,
): ColumnsType<DepartmentItem> {
  const { onDelete, isDeleting } = params;

  return [
    {
      title: "部门ID",
      dataIndex: "id",
      key: "id",
      width: 96,
      sorter: true,
    },
    {
      title: "部门名称",
      dataIndex: "department",
      key: "department",
      width: 240,
      sorter: true,
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_: unknown, record: DepartmentItem) => (
        <ActionCell
          record={record}
          actions={[
            {
              key: "delete",
              label: "删除",
              danger: true,
              loading: isDeleting?.(record.id),
              confirm: {
                title: "确认删除该部门？",
                content: `部门：${record.department}`,
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
