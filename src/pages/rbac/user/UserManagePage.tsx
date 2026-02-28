// src/pages/rbac/user/UserManagePage.tsx

import { useMemo, useState } from "react";
import { Button, Card, Space, Typography, message, Tooltip } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { confirmAsync, createAntdNotify } from "../../../shared/ui";

import { Can } from "../../../shared/components/guard/Can";

import { insertUser } from "../../../features/rbac/user/api";
import type { UserCreatePayload } from "../../../features/rbac/user/types";

import { useUserManagePage } from "../../../features/rbac/user/hooks/useUserManagePage";
import { useUserSpecialScore } from "../../../features/rbac/user/hooks/useUserSpecialScore";
import { useUsersScoreByTimeExport } from "../../../features/rbac/user/hooks/useUsersScoreByTimeExport";

// ✅ 新增：用户详情-报名记录表格 hook（触发 /activity/usernameApplications）
import { useUserApplicationsTable } from "../../../features/rbac/user/hooks/useUserApplicationsTable";

import CreateUserModal from "./CreateUserModal";
import ImportUsersModal from "./ImportUsersModal";
import ImportResultModal from "./ImportResultModal";
import UserDetailDrawer from "./UserDetailDrawer";
import SpecialScoreModal from "./SpecialScoreModal";
import ExportByTimeModal from "./ExportByTimeModal";

const { Title } = Typography;

// 🔒 删除功能开关（上线时改为 true 即可）
const ENABLE_DELETE = true;

function adaptImportResult(result: any) {
  if (!result) return null;

  if (typeof result === "object" && result) {
    const anyR = result as any;

    const hasShellLike =
      "code" in anyR || "msg" in anyR || "data" in anyR || "timestamp" in anyR;

    if (hasShellLike) {
      return {
        code: typeof anyR.code === "number" ? anyR.code : undefined,
        msg: typeof anyR.msg === "string" ? anyR.msg : undefined,
        data: anyR.data,
        timestamp: Number(anyR.timestamp ?? Date.now()),
      };
    }
  }

  const successCount = Number((result as any).successCount ?? 0);
  const failCount = Number((result as any).failCount ?? 0);

  const lines: string[] = [];
  lines.push(`成功：${successCount} 条`);
  lines.push(`失败：${failCount} 条`);

  if (
    Array.isArray((result as any).failedUsernames) &&
    (result as any).failedUsernames.length
  ) {
    lines.push(`失败学号：${(result as any).failedUsernames.join(", ")}`);
  }

  if (
    Array.isArray((result as any).failedDetails) &&
    (result as any).failedDetails.length
  ) {
    const detailText = (result as any).failedDetails
      .slice(0, 20)
      .map((x: any) => `- ${x.username ?? "-"}：${x.reason ?? "-"}`)
      .join("\n");
    lines.push(`失败明细（最多展示 20 条）：\n${detailText}`);
  }

  if ((result as any).failedFileUrl) {
    lines.push(`失败名单下载：${String((result as any).failedFileUrl)}`);
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

    // ✅ 新增：详情联动刷新能力（来自 useUserManagePage）
    refreshDetail,
    markDetailDirty,

    importFlow,
  } = useUserManagePage({ onNotify: notify });

  const specialScore = useUserSpecialScore({
    onNotify: notify,
    onAfterSubmit: () => {
      table.reload();
    },
  });

  const exportByTime = useUsersScoreByTimeExport({
    onNotify: notify,
  });

  // ✅ 详情 Drawer 下半部分（报名记录表）
  // 仅在 Drawer 打开时才传入 username，避免无意义请求
  // ✅ 删除/变更后联动：刷新上半部分详情 + 标记 dirty（用于关闭后刷新用户列表）+ 刷新列表
  const apps = useUserApplicationsTable({
    username: detail.open ? detail.data?.username : null,
    onAfterMutate: async () => {
      // 1) 关闭 Drawer 时需要刷新列表（避免“关闭后列表不变”）
      markDetailDirty();

      // 2) 立即刷新 Drawer 上半部分（serviceScore/lectureNum 等字段变化）
      await refreshDetail();

      // 3) 如列表也展示分数/次数等字段，可同步刷新用户列表（不等关闭）
      table.reload();
    },
  });

  const hasSelection = selectedUsernames.length > 0;

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
    } catch (err: any) {
      notify({ kind: "error", msg: err?.message ?? "创建失败，请稍后重试" });
      throw err;
    } finally {
      setCreating(false);
    }
  };

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

  const previewOpen = !!importFlow.preview.open;
  const previewStats = importFlow.preview.stats ?? null;

  const resultOpen = !!importFlow.result.open;
  const adaptedResult = useMemo(
    () => adaptImportResult(importFlow.result.result),
    [importFlow.result.result],
  );

  const busy =
    !!creating ||
    !!locking ||
    !!deleting ||
    !!importFlow.submitting ||
    !!specialScore.submitting ||
    !!exportByTime.exporting;

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
                用户管理
              </Title>
            </Space>

            <Button
              type="primary"
              onClick={() => setCreateOpen(true)}
              disabled={busy}
            >
              创建用户
            </Button>
          </Space>
        }
        bodyStyle={{ paddingTop: 12 }}
      >
        <TableToolbar
          left={
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                用户列表
              </Title>
            </Space>
          }
          showSearch
          keyword={table.query.keyword}
          onKeywordChange={table.setKeyword}
          onRefresh={table.reload}
          onReset={table.reset}
          selectedCount={selectedUsernames.length}
          onClearSelection={() => setSelectedUsernames([])}
          right={
            <Space>
              <Button onClick={specialScore.openModal} disabled={busy}>
                录入加分
              </Button>

              <Can roles={[0]}>
                <Button onClick={importFlow.openPreview} disabled={busy}>
                  批量导入
                </Button>
              </Can>

              <Button
                disabled={!hasSelection}
                loading={!!locking}
                onClick={confirmBatchLock}
              >
                批量封锁
              </Button>

              <Tooltip title={!ENABLE_DELETE ? "删除功能暂未开放" : undefined}>
                <span>
                  <Button
                    danger
                    disabled={!ENABLE_DELETE || !hasSelection}
                    loading={ENABLE_DELETE ? !!deleting : false}
                    onClick={ENABLE_DELETE ? confirmBatchDelete : undefined}
                  >
                    批量删除
                  </Button>
                </span>
              </Tooltip>

              <Button onClick={exportByTime.openModal} disabled={busy}>
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
          scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
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

      {/* ✅ 按时间段导出弹窗（你说现在不需要列设置：所以不传 presets/visibleKeys/...） */}
      <ExportByTimeModal
        open={exportByTime.open}
        onClose={exportByTime.closeModal}
        loading={exportByTime.exporting}
        value={exportByTime.range}
        onChangeRange={exportByTime.setTimeRange}
        onConfirm={exportByTime.exportByTime}
      />

      <SpecialScoreModal
        open={specialScore.open}
        onClose={specialScore.closeModal}
        submitting={specialScore.submitting}
        searching={specialScore.searching}
        value={specialScore.value}
        options={specialScore.options}
        onNameInput={specialScore.onNameInput}
        onUsernameInput={specialScore.onUsernameInput}
        onPickUser={specialScore.onPickUser}
        clearPickedUser={specialScore.clearPickedUser}
        onTypeChange={specialScore.onTypeChange}
        onScoreChange={specialScore.onScoreChange}
        onSubmit={specialScore.submit}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={creating}
        onSubmit={submitCreate}
      />

      <ImportUsersModal
        open={previewOpen}
        onClose={importFlow.closePreview}
        parsing={!!importFlow.parsing}
        submitting={!!importFlow.submitting}
        previewStats={previewStats}
        onFileSelected={importFlow.parseFile}
        onConfirmImport={async () => {
          await importFlow.submitImportAndReload();
        }}
      />

      <ImportResultModal
        open={resultOpen}
        onClose={importFlow.closeResult}
        result={adaptedResult}
        onDownloadFailed={(url) => {
          notify({ kind: "info", msg: `失败名单下载：${url}` });
        }}
      />

      <UserDetailDrawer
        open={detail.open}
        onClose={closeDetail}
        loading={detail.loading}
        detail={detail.data ?? null}
        sourceApi="/user/inforUsername"
        appsTable={{
          rows: apps.table.rows,
          total: apps.table.total,
          loading: apps.table.loading,
          error: apps.table.error,

          query: apps.table.query,
          onQueryChange: apps.table.onQueryChange,

          setKeyword: apps.table.setKeyword,
          reload: apps.table.reload,
          reset: apps.table.reset,

          exporting: apps.table.exporting,
          exportCsv: apps.table.exportCsv,

          columns: apps.columns,
          presets: apps.presets,
          columnPrefs: {
            visibleKeys: apps.columnPrefs.visibleKeys,
            setVisibleKeys: apps.columnPrefs.setVisibleKeys,
            resetToDefault: apps.columnPrefs.resetToDefault,
            orderedKeys: (apps.columnPrefs as any).orderedKeys,
            setOrderedKeys: (apps.columnPrefs as any).setOrderedKeys,
          },
        }}
      />
    </Space>
  );
}
