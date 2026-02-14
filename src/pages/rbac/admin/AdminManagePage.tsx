// src/pages/rbac/admin/AdminManagePage.tsx

import { useEffect, useMemo, useRef } from "react";
import { Alert, Button, Card, Space, Typography, message } from "antd";

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

  // ✅ 关键：只执行一次，彻底避免“依赖变动 → effect 反复跑”
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // 页面首次加载：拉一次部门
    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 故意空依赖：一次性执行

  const antdColumns = useMemo(() => {
    return columnPrefs.applyPresetsToAntdColumns(columns);
  }, [columns, columnPrefs]);

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
        <Alert
          type="info"
          showIcon
          message="展示所有部门成员；支持本地分页/搜索/筛选/排序/导出；任命职务会把用户加入成员列表。"
          style={{ marginBottom: 12 }}
        />

        <TableToolbar
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
          rowKey="username"
          columns={antdColumns}
          dataSource={table.rows}
          loading={table.loading}
          error={table.error}
          total={table.total}
          query={table.query}
          onQueryChange={table.onQueryChange}
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
