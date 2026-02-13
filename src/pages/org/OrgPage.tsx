// src/pages/org/OrgPage.tsx

import { useMemo, useState } from "react";
import { Button, Card, Space, Typography } from "antd";

import {
  TableToolbar,
  SmartTable,
  ColumnSettings,
} from "../../shared/components/table";

import { useDepartmentManage } from "../../features/org/department/hooks/useDepartmentManage";
import { buildDepartmentColumns } from "../../features/org/department/table/columns";
import { departmentColumnPresets } from "../../features/org/department/table/presets";

import CreateDepartmentModal from "./CreateDepartmentModal";

const { Title } = Typography;

export default function OrgPage() {
  const m = useDepartmentManage();
  const t = m.table;

  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo(() => {
    const base = buildDepartmentColumns({
      onDelete: (record) => m.submitDelete({ departmentId: record.id }), // ✅ 按接口 payload
    });

    return t.applyPresetsToAntdColumns(base);
  }, [m, t]);

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        部门管理
      </Title>

      <TableToolbar
        /** 左侧标题：填补空旷 */
        left={<strong style={{ fontSize: 14 }}>部门列表</strong>}
        /** 搜索框 */
        showSearch
        searchMode="change"
        debounceMs={300}
        searchPlaceholder="搜索部门名称"
        keyword={t.query.keyword}
        onKeywordChange={t.setKeyword}
        /** 重置/刷新 */
        onReset={t.reset}
        onRefresh={t.reload}
        loading={t.loading}
        /** 右侧按钮区 */
        right={
          <Space>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新建部门
            </Button>

            <Button onClick={() => t.exportCsv()} loading={t.exporting}>
              导出 CSV
            </Button>

            <ColumnSettings
              presets={departmentColumnPresets}
              visibleKeys={t.visibleKeys}
              onChange={t.setVisibleKeys}
              orderedKeys={t.orderedKeys}
              onOrderChange={t.setOrderedKeys}
              onReset={t.resetToDefault}
            />
          </Space>
        }
      />

      <SmartTable
        bizKey="org.department"
        enableColumnResize
        sticky
        columns={columns}
        dataSource={t.rows}
        rowKey="id"
        query={t.query}
        total={t.total}
        loading={t.loading}
        error={t.error}
        onQueryChange={t.onQueryChange}
      />

      <CreateDepartmentModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        createDepartment={
          (department) => m.submitCreate({ department }) // ✅ 按接口 payload
        }
        onSuccess={() => t.reload()}
      />
    </Card>
  );
}
