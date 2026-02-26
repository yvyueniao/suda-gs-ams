// src/pages/rbac/admin/AdminManagePage.tsx
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Button, Card, Space, Typography, message } from "antd";

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

    onSearchUser,
    onPickUser,
    clearPickedUser,
    appointModalKey,
    submittingAppoint,
    submitAppoint,
    searchingSuggestion,
  } = useAdminManagePage({ onNotify: notify });

  // ✅ init 保留：只执行一次（页面初始化时加载部门）
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 关闭弹窗时：顺手清理选择态（避免下次打开残留）
  const handleCloseModal = useCallback(() => {
    clearPickedUser();
    closeAppointModal();
  }, [clearPickedUser, closeAppointModal]);

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        title={
          <Space
            style={{ width: "100%", justifyContent: "space-between" }}
            align="center"
            wrap
          >
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}>
                管理员管理
              </Title>
            </Space>

            {/* ✅ openModal 只打开：不在这里加载部门（部门已在 init 加载） */}
            <Button type="primary" onClick={openAppointModal}>
              任命职务
            </Button>
          </Space>
        }
        bodyStyle={{ paddingTop: 12 }}
      >
        <TableToolbar
          left={
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                管理员列表
              </Title>
            </Space>
          }
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
            </Space>
          }
        />

        <SmartTable
          bizKey="rbac.admin.members"
          enableColumnResize
          sticky
          scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
          rowKey="username"
          columns={columns}
          dataSource={table.rows}
          loading={table.loading}
          error={table.error}
          total={table.total}
          query={table.query}
          onQueryChange={table.onQueryChange}
        />
      </Card>

      <AppointRoleModal
        key={appointModalKey}
        open={appointModal.open}
        onClose={handleCloseModal}
        departments={departments ?? []}
        loadingDepartments={!!loadingDepartments}
        suggestions={appointModal.suggestions}
        searchingSuggestion={!!searchingSuggestion}
        values={appointModal.values}
        onSearchUser={onSearchUser}
        onPickUser={onPickUser}
        clearPickedUser={clearPickedUser}
        submitting={!!submittingAppoint}
        onSubmit={submitAppoint}
      />
    </Space>
  );
}
