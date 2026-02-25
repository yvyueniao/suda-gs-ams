// src/pages/org/OrgPage.tsx

import { useMemo, useState } from "react";
import { Button, Card, Space, Typography } from "antd";

import {
  TableToolbar,
  SmartTable,
  ColumnSettings,
} from "../../shared/components/table";

import { useAsyncMapAction } from "../../shared/actions";

import { useDepartmentManage } from "../../features/org/department/hooks/useDepartmentManage";
import { buildDepartmentColumns } from "../../features/org/department/table/columns";
import { departmentColumnPresets } from "../../features/org/department/table/presets";

import CreateDepartmentModal from "./CreateDepartmentModal";

const { Title } = Typography;

export default function OrgPage() {
  const m = useDepartmentManage();
  const t = m.table;

  const [createOpen, setCreateOpen] = useState(false);

  const del = useAsyncMapAction<number, string>({
    // ✅ 提示信息：优先使用后端返回值（data/msg），为空再兜底
    successMessage: (_id, result) => String(result ?? "").trim() || "删除成功",
    errorMessage: "删除失败",
  });

  const columns = useMemo(() => {
    const base = buildDepartmentColumns({
      isDeleting: (id) => del.isLoading(id),
      onDelete: (record) =>
        del.run(record.id, () => m.submitDelete({ departmentId: record.id })),
    });

    return t.applyPresetsToAntdColumns(base);
  }, [m, t, del]);

  return (
    <Card
      title={
        <Space
          style={{ width: "100%", justifyContent: "space-between" }}
          align="center"
          wrap
        >
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              部门管理
            </Title>
          </Space>

          {/* ✅ 主操作按钮移动到标题右侧 */}
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建部门
          </Button>
        </Space>
      }
    >
      <TableToolbar
        left={
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              部门列表
            </Title>
          </Space>
        }
        showSearch
        searchMode="change"
        debounceMs={300}
        searchPlaceholder="搜索部门名称"
        keyword={t.query.keyword}
        onKeywordChange={t.setKeyword}
        onReset={t.reset}
        onRefresh={t.reload}
        loading={t.loading}
        right={
          <Space>
            {/* ✅ 创建按钮已移除，这里只保留表格工具类按钮 */}
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
        scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
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
        createDepartment={(department) => m.submitCreate({ department })}
        // ✅ 方案 A：刷新由 useDepartmentManage.submitCreate 内部完成，这里不再重复 reload
      />
    </Card>
  );
}
