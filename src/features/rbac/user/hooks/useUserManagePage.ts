// src/features/rbac/user/hooks/useUserManagePage.ts

import { useCallback, useMemo, useState } from "react";

import type { Notify } from "../../../../shared/ui";

import type { UserInfo, UserTableRow } from "../types";

import { useUserMembersTable } from "./useUserMembersTable";
import { useUserRowActions } from "./useUserRowActions";
import { useUserBatchActions } from "./useUserBatchActions";
import { useUserImportFlow } from "./useUserImportFlow";

/** ✅ 稳定 noop，避免每次 render 产生新函数 */
const noopNotify: Notify = () => {
  // noop
};

type UserDetailState = {
  open: boolean;
  loading: boolean;
  data?: UserInfo;
};

export function useUserManagePage(options?: { onNotify?: Notify }) {
  /** ✅ notify 必须稳定，否则下层 hooks callback 容易抖动 */
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // ======================================================
  // 1) 行内动作（解封/详情）
  // ======================================================
  const rowActions = useUserRowActions({ onNotify: notify });

  // 详情弹窗状态（UI 在 pages 层渲染）
  const [detail, setDetail] = useState<UserDetailState>({
    open: false,
    loading: false,
    data: undefined,
  });

  const closeDetail = useCallback(() => {
    setDetail({ open: false, loading: false, data: undefined });
  }, []);

  const openDetail = useCallback(
    async (row: UserTableRow) => {
      setDetail({ open: true, loading: true, data: undefined });
      try {
        const info = await rowActions.fetchDetail(row);
        setDetail({ open: true, loading: false, data: info });
      } catch {
        // rowActions 内部已经 notify，这里只把 loading 复位
        setDetail({ open: true, loading: false, data: undefined });
      }
    },
    [rowActions],
  );

  // ======================================================
  // 2) 批量动作（批量删除/批量封锁）
  // ======================================================
  const batchActions = useUserBatchActions({ onNotify: notify });

  // 表格勾选（页面层把 rowSelection.onChange 回写进来）
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);

  // ======================================================
  // 3) 表格编排（后端分页 + 当前页本地筛选/排序）
  // - columns 的 onUnlock/onDetail 从这里注入
  // ======================================================
  const { table, columns, presets, columnPrefs } = useUserMembersTable({
    onUnlock: async (row) => {
      // 你要求：解封固定显示；是否禁用由页面/列决定
      await rowActions.unlock(row);
      table.reload();
    },
    onDetail: async (row) => {
      await openDetail(row);
    },
  });

  // ======================================================
  // 4) 批量操作：封锁 / 删除（删除只批量）
  // - 二次确认建议放页面层（confirmAsync）
  // ======================================================
  const runBatchDelete = useCallback(async () => {
    await batchActions.batchDelete(selectedUsernames);
    setSelectedUsernames([]);
    table.reload();
  }, [batchActions, selectedUsernames, table]);

  const runBatchLock = useCallback(async () => {
    await batchActions.batchLock(selectedUsernames);
    setSelectedUsernames([]);
    table.reload();
  }, [batchActions, selectedUsernames, table]);

  // ======================================================
  // 5) 导入流程（xlsx 解析 → 预览 → 提交 → 结果）
  // - 预览/结果弹窗 UI 在 pages 层
  // - 成功提交后刷新列表
  // ======================================================
  const importFlow = useUserImportFlow({ onNotify: notify });

  const submitImportAndReload = useCallback(async () => {
    await importFlow.submitImport();
    table.reload();
  }, [importFlow, table]);

  return {
    // table
    table,
    columns,
    presets,
    columnPrefs,

    // selection (for batch ops)
    selectedUsernames,
    setSelectedUsernames,

    // row actions state
    isUnlocking: rowActions.isUnlocking,
    isLoadingDetail: rowActions.isLoadingDetail,

    // detail modal state
    detail,
    openDetail,
    closeDetail,

    // batch ops
    deleting: batchActions.deleting,
    locking: batchActions.locking,
    runBatchDelete,
    runBatchLock,

    // import flow (preview/result state + parse + submit)
    importFlow: {
      ...importFlow,
      submitImportAndReload,
    },
  };
}
