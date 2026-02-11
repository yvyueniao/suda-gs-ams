// src/pages/org/OrgPage.tsx

import { useMemo, useState } from "react";
import { Button, Card, Space } from "antd";

import {
  SmartTable,
  TableToolbar,
  ColumnSettings,
} from "../../shared/components/table";

import { useAsyncMapAction } from "../../shared/actions";

import CreateDepartmentModal from "./CreateDepartmentModal";

import { useDepartmentManage } from "../../features/org/department/hooks/useDepartmentManage";
import { buildDepartmentColumns } from "../../features/org/department/table/columns";
import { departmentColumnPresets } from "../../features/org/department/table/presets";

export default function OrgPage() {
  const [createOpen, setCreateOpen] = useState(false);

  // ✅ useDepartmentManage 无参数（按你报错修正）
  const { table, submitCreate, submitDelete } = useDepartmentManage();

  // ✅ 行内删除 loading（按 id 管理）
  const deleteAction = useAsyncMapAction<number>({
    successMessage: "删除成功",
  });

  const columns = useMemo(() => {
    return buildDepartmentColumns({
      onDelete: (record) =>
        deleteAction.run(record.id, async () => {
          await submitDelete({ departmentId: record.id });
          table.reload();
        }),
      isDeleting: (id) => deleteAction.isLoading(id),
    });
  }, [deleteAction, submitDelete, table]);

  const antdColumns = useMemo(() => {
    return table.applyPresetsToAntdColumns(columns);
  }, [table, columns]);

  return (
    <Card title="部门管理">
      <TableToolbar
        keyword={table.query.keyword}
        onKeywordChange={(v) => table.onQueryChange({ keyword: v })}
        onReset={table.reset} // ✅ 你提示里说有 reset
        onRefresh={table.reload}
        right={
          <Space>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新建部门
            </Button>

            <Button onClick={() => table.exportCsv()} loading={table.exporting}>
              导出 CSV
            </Button>

            <ColumnSettings
              presets={departmentColumnPresets} // ✅ 关键：不再 require
              visibleKeys={table.visibleKeys}
              onChange={table.setVisibleKeys}
              orderedKeys={table.orderedKeys}
              onOrderChange={table.setOrderedKeys}
              onReset={table.resetToDefault}
            />
          </Space>
        }
      />

      <SmartTable
        bizKey="org.department"
        columns={antdColumns}
        dataSource={table.rows}
        rowKey="id"
        query={table.query}
        total={table.total}
        loading={table.loading}
        error={table.error}
        onQueryChange={table.onQueryChange}
        sticky
        enableColumnResize
      />

      <CreateDepartmentModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        createDepartment={(name) => submitCreate({ department: name })}
        onSuccess={() => table.reload()}
      />
    </Card>
  );
}
