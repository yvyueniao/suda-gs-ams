//src\pages\rbac\admin\AdminManagePage.tsx
import { useEffect, useMemo, useRef } from "react";
import { Button, Card, Space, Typography, message } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { createAntdNotify } from "../../../shared/ui/notify";
import { useAdminManagePage } from "../../../features/rbac/admin/hooks/useAdminManagePage";
import AppointRoleModal from "./AppointRoleModal";

const { Title } = Typography;

export default function AdminManagePage() {
  const notify = useMemo(() => createAntdNotify(message), []);

  const {
    table,
    columns,
    presets,
    columnPrefs,

    departments,
    loadingDepartments,
    loadDepartments,

    appointModal,
    openAppointModal,
    closeAppointModal,
    onNameInputChange,
    onPickSuggestion,
    submittingAppoint,
    submitAppoint,
    searchingSuggestion,
  } = useAdminManagePage({ onNotify: notify });

  // ✅ 关键：只执行一次
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title={
          <Title level={5} style={{ margin: 0 }}>
            管理员管理
          </Title>
        }
        bodyStyle={{ paddingTop: 12 }}
      >
        <TableToolbar
          /** ✅ 新增：左侧标题，避免左侧空旷（写法对齐 OrgPage） */
          left={<strong style={{ fontSize: 14 }}>管理员列表</strong>}
          showSearch
          keyword={table.query.keyword}
          onKeywordChange={table.setKeyword}
          onRefresh={table.reload}
          onReset={table.reset}
          right={
            <Space>
              <Button
                onClick={() =>
                  table.exportCsv?.({
                    filenameBase: "管理员管理-部门成员",
                    notify: (type, text) => notify({ kind: type, msg: text }),
                  })
                }
              >
                导出
              </Button>

              <ColumnSettings
                presets={presets}
                visibleKeys={columnPrefs.visibleKeys}
                onChange={columnPrefs.setVisibleKeys}
                orderedKeys={(columnPrefs as any).orderedKeys}
                onOrderChange={(columnPrefs as any).setOrderedKeys}
                onReset={columnPrefs.resetToDefault}
              />

              <Button type="primary" onClick={() => void openAppointModal()}>
                任命职务
              </Button>
            </Space>
          }
        />

        <SmartTable
          bizKey="rbac.admin.members"
          enableColumnResize // ✅ 开启拖拽调整列宽
          sticky // 可选：表头吸顶（和部门页一致就加）
          rowKey="username"
          columns={columns}
          dataSource={table.rows}
          loading={table.loading}
          error={table.error}
          total={table.total}
          query={table.query}
          onQueryChange={table.onQueryChange}
          /** ✅ 关键：把 filters 变化接住（否则筛选永远不进 q.query.filters） */
          onFiltersChange={(filters: Record<string, FilterValue | null>) => {
            table.onQueryChange({ filters });
          }}
        />
      </Card>

      <AppointRoleModal
        open={appointModal.open}
        onClose={closeAppointModal}
        departments={departments ?? []}
        loadingDepartments={!!loadingDepartments}
        suggestions={appointModal.suggestions}
        searchingSuggestion={!!searchingSuggestion}
        values={appointModal.values}
        onNameInputChange={onNameInputChange}
        onPickSuggestion={onPickSuggestion}
        submitting={!!submittingAppoint}
        onSubmit={submitAppoint}
      />
    </Space>
  );
}
