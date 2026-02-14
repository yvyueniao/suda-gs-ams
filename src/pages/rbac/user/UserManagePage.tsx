// src/pages/rbac/user/UserManagePage.tsx

import { useMemo, useState } from "react";
import { Button, Card, Space, Typography, message } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { confirmAsync, createAntdNotify } from "../../../shared/ui";

import { insertUser } from "../../../features/rbac/user/api";
import type {
  UserCreatePayload,
  BatchInsertUserResult,
} from "../../../features/rbac/user/types";

import { useUserManagePage } from "../../../features/rbac/user/hooks/useUserManagePage";

import CreateUserModal from "./CreateUserModal";
import ImportUsersModal from "./ImportUsersModal";
import ImportResultModal from "./ImportResultModal";
import UserDetailDrawer from "./UserDetailDrawer";

const { Title } = Typography;

function adaptImportResult(resultState: any): BatchInsertUserResult {
  if (!resultState) {
    return { successCount: 0, failCount: 0 };
  }

  const successCount =
    Number(
      resultState.successCount ?? resultState.success ?? resultState.ok ?? 0,
    ) || 0;

  const failCount =
    Number(
      resultState.failCount ?? resultState.fail ?? resultState.failed ?? 0,
    ) || 0;

  return {
    successCount,
    failCount,
    failedUsernames: resultState.failedUsernames ?? resultState.failedUsers,
    failedDetails: resultState.failedDetails ?? resultState.details,
    failedFileUrl: resultState.failedFileUrl ?? resultState.fileUrl,
  };
}

export default function UserManagePage() {
  const notify = useMemo(() => createAntdNotify(message), []);

  const {
    table,
    columns,
    presets,
    columnPrefs,

    selectedUsernames,
    setSelectedUsernames,

    deleting,
    locking,
    runBatchDelete,
    runBatchLock,

    detail,
    closeDetail,

    importFlow,
  } = useUserManagePage({ onNotify: notify });

  const hasSelection = selectedUsernames.length > 0;

  // 创建用户操作
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const submitCreate = async (payload: UserCreatePayload) => {
    if (creating) return;

    setCreating(true);
    try {
      await insertUser(payload);
      notify({ kind: "success", msg: "创建成功" });
      setCreateOpen(false);
      table.reload(); // Ensure the table reloads
    } catch {
      notify({ kind: "error", msg: "创建失败，请稍后重试" });
    } finally {
      setCreating(false);
    }
  };

  // 批量删除操作
  const confirmBatchDelete = async () => {
    if (!hasSelection) return;

    const confirmed = await confirmAsync({
      title: "确认批量删除？",
      content: `将删除 ${selectedUsernames.length} 个用户（仅支持批量删除）`,
      okText: "删除",
      cancelText: "取消",
    });

    if (!confirmed) return;
    await runBatchDelete();
    table.reload(); // Ensure the table reloads after the operation
  };

  // 批量封锁操作
  const confirmBatchLock = async () => {
    if (!hasSelection) return;

    const confirmed = await confirmAsync({
      title: "确认批量封锁？",
      content: `将封锁 ${selectedUsernames.length} 个用户账号`,
      okText: "封锁",
      cancelText: "取消",
    });

    if (!confirmed) return;
    await runBatchLock();
    table.reload(); // Ensure the table reloads after the operation
  };

  // Import Flow
  const previewOpen = !!(importFlow.preview as any)?.open;
  const previewStats =
    (importFlow.preview as any)?.stats ??
    (importFlow.preview as any)?.previewStats ??
    null;

  const resultOpen = !!(importFlow as any)?.result?.open;
  const rawResultState = (importFlow as any)?.result?.data ?? null;
  const adaptedResult = adaptImportResult(rawResultState);

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        title={
          <Title level={5} style={{ margin: 0 }}>
            用户管理
          </Title>
        }
        bodyStyle={{ paddingTop: 12 }}
      >
        <TableToolbar
          left={<strong style={{ fontSize: 14 }}>用户列表</strong>}
          showSearch
          keyword={table.query.keyword}
          onKeywordChange={table.setKeyword}
          onRefresh={() => table.reload()} // Refresh button triggers table.reload
          onReset={table.reset}
          right={
            <Space>
              <Button onClick={importFlow.openPreview}>批量导入</Button>
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                创建用户
              </Button>
              <Button
                disabled={!hasSelection}
                loading={!!locking}
                onClick={() => confirmBatchLock()}
              >
                批量封锁
              </Button>
              <Button
                danger
                disabled={!hasSelection}
                loading={!!deleting}
                onClick={() => confirmBatchDelete()}
              >
                批量删除
              </Button>
              <Button
                loading={!!table.exporting}
                onClick={() =>
                  table.exportCsv?.({
                    filenameBase: "用户管理-用户列表",
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
          bizKey="rbac.user.members"
          enableColumnResize
          sticky
          rowKey="username"
          columns={columns}
          dataSource={table.rows}
          loading={table.loading}
          error={table.error}
          total={table.total}
          query={table.query}
          onQueryChange={table.onQueryChange}
          onFiltersChange={(filters: Record<string, FilterValue | null>) => {
            table.onQueryChange({ filters });
          }}
          rowSelection={{
            selectedRowKeys: selectedUsernames,
            onChange: (keys) => setSelectedUsernames(keys as string[]),
          }}
        />
      </Card>

      {/* 创建用户 */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={creating}
        onSubmit={submitCreate}
      />

      {/* 导入用户：预览弹窗（open/close 直接走 importFlow.preview 状态机） */}
      <ImportUsersModal
        open={previewOpen}
        onClose={importFlow.closePreview}
        parsing={!!importFlow.parsing}
        submitting={!!(importFlow as any).submitting}
        previewStats={previewStats}
        onFileSelected={async (file) => {
          const fn =
            (importFlow as any).parseFile ?? (importFlow as any).setFile;
          if (typeof fn === "function") await fn(file);
        }}
        onConfirmImport={async () => {
          await importFlow.submitImportAndReload();
          importFlow.closePreview();
        }}
      />

      {/* 导入结果弹窗：你们是 result: { open, data }，这里做适配 */}
      <ImportResultModal
        open={resultOpen}
        onClose={importFlow.closeResult}
        result={adaptedResult}
        onDownloadFailed={(url) => {
          notify({ kind: "info", msg: `失败名单下载：${url}` });
        }}
      />

      {/* 详情 Drawer */}
      <UserDetailDrawer
        open={detail.open}
        onClose={closeDetail}
        loading={detail.loading}
        detail={detail.data ?? null}
      />
    </Space>
  );
}
