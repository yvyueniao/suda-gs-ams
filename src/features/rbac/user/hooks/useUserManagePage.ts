// src/features/rbac/user/hooks/useUserManagePage.ts

import { useCallback, useMemo, useRef, useState } from "react";

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

  /**
   * ✅ 记录“当前详情来自哪一行”，用于详情刷新（上半部分）
   * 注意：这里存 row，而不是 username 字符串，避免后续 fetchDetail 需要更多字段时不够用
   */
  const currentDetailRowRef = useRef<UserTableRow | null>(null);

  /**
   * ✅ Drawer 内发生过“会影响列表/详情”的变更时标记 dirty
   * 例如：在详情下半部分删除加分/报名记录
   */
  const detailDirtyRef = useRef(false);
  const markDetailDirty = useCallback(() => {
    detailDirtyRef.current = true;
  }, []);

  /**
   * ✅ 刷新“上半部分详情数据”
   * 用于：删除报名/加分后，serviceScore/lectureNum 等字段需要更新
   */
  const refreshDetail = useCallback(async () => {
    const row = currentDetailRowRef.current;
    if (!row) return;

    setDetail((s) => ({ ...s, loading: true }));
    try {
      const info = await rowActions.fetchDetail(row);
      setDetail({ open: true, loading: false, data: info });
    } catch {
      // rowActions 内部已经 notify，这里只复位 loading
      setDetail((s) => ({ ...s, loading: false }));
    }
  }, [rowActions]);

  /**
   * ✅ 关闭详情：如果期间发生过变更（dirty），则触发用户列表刷新
   * 通过 ref 注入 reload，避免 hooks 闭包拿到旧值/拿不到 table
   */
  const onCloseReloadRef = useRef<null | (() => void)>(null);

  const closeDetail = useCallback(() => {
    if (detailDirtyRef.current) {
      detailDirtyRef.current = false;
      onCloseReloadRef.current?.();
    }

    currentDetailRowRef.current = null;
    setDetail({ open: false, loading: false, data: undefined });
  }, []);

  const openDetail = useCallback(
    async (row: UserTableRow) => {
      currentDetailRowRef.current = row;

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

  // ✅ 给 closeDetail 用：稳定拿到最新 table.reload
  onCloseReloadRef.current = table.reload;

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

    // ✅ 新增：给详情下半部分（报名/加分列表）联动刷新使用
    refreshDetail,
    markDetailDirty,

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
