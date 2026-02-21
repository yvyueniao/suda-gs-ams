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
import type { UserCreatePayload } from "../../../features/rbac/user/types";

import { useUserManagePage } from "../../../features/rbac/user/hooks/useUserManagePage";

import CreateUserModal from "./CreateUserModal";
import ImportUsersModal from "./ImportUsersModal";
import ImportResultModal from "./ImportResultModal";
import UserDetailDrawer from "./UserDetailDrawer";

const { Title } = Typography;

/**
 * ✅ 导入结果适配：
 * - 你当前 useUserImportFlow.result.result 是结构化结果（successCount/failCount...）
 * - 但 ImportResultModal 的展示模型是统一返回壳（code/msg/data/timestamp）
 * - 所以这里做一层“展示适配”，不改 hooks 也能跑
 */
function adaptImportResult(result: any) {
  if (!result) return null;

  const successCount = Number(result.successCount ?? 0);
  const failCount = Number(result.failCount ?? 0);

  const lines: string[] = [];
  lines.push(`成功：${successCount} 条`);
  lines.push(`失败：${failCount} 条`);

  if (Array.isArray(result.failedUsernames) && result.failedUsernames.length) {
    lines.push(`失败学号：${result.failedUsernames.join(", ")}`);
  }

  if (Array.isArray(result.failedDetails) && result.failedDetails.length) {
    const detailText = result.failedDetails
      .slice(0, 20)
      .map((x: any) => `- ${x.username ?? "-"}：${x.reason ?? "-"}`)
      .join("\n");
    lines.push(`失败明细（最多展示 20 条）：\n${detailText}`);
  }

  if (result.failedFileUrl) {
    lines.push(`失败名单下载：${String(result.failedFileUrl)}`);
  }

  return {
    code: failCount > 0 ? 500 : 200,
    msg: failCount > 0 ? "部分导入失败" : "导入成功",
    data: lines.join("\n"),
    timestamp: Date.now(),
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
      table.reload();
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
    table.reload();
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
    table.reload();
  };

  // Import Flow（✅ 不再 any-乱取字段，按 hooks 的真实结构拿）
  const previewOpen = !!importFlow.preview.open;
  const previewStats = importFlow.preview.stats ?? null;

  const resultOpen = !!importFlow.result.open;
  const adaptedResult = useMemo(
    () => adaptImportResult(importFlow.result.result),
    [importFlow.result.result],
  );

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
          onRefresh={table.reload}
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
                onClick={confirmBatchLock}
              >
                批量封锁
              </Button>

              <Button
                danger
                disabled={!hasSelection}
                loading={!!deleting}
                onClick={confirmBatchDelete}
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

      {/* 导入用户：预览弹窗 */}
      <ImportUsersModal
        open={previewOpen}
        onClose={importFlow.closePreview}
        parsing={!!importFlow.parsing}
        submitting={!!importFlow.submitting}
        previewStats={previewStats}
        onFileSelected={importFlow.parseFile}
        onConfirmImport={async () => {
          await importFlow.submitImportAndReload();
          // submitImport 内部已 closePreview，这里不重复关也行
        }}
      />

      {/* 导入结果弹窗：用“展示适配”后的壳结构 */}
      <ImportResultModal
        open={resultOpen}
        onClose={importFlow.closeResult}
        result={adaptedResult}
        onDownloadFailed={(url) => {
          notify({ kind: "info", msg: `失败名单下载：${url}` });
        }}
      />

      {/* 详情 Drawer（✅ 不再写死 /user/info；来源你按实际改成你截图里的接口） */}
      <UserDetailDrawer
        open={detail.open}
        onClose={closeDetail}
        loading={detail.loading}
        detail={detail.data ?? null}
        sourceApi="/department/allMembers"
      />
    </Space>
  );
}
