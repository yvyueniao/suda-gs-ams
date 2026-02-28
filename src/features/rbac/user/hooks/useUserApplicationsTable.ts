// src/features/rbac/user/hooks/useUserApplicationsTable.ts

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../../shared/components/table";
import type {
  TableFetcher,
  TableQuery,
} from "../../../../shared/components/table";

import { useAsyncMapAction } from "../../../../shared/actions";

import { getUsernameApplications, deleteApply } from "../api";
import type { UsernameApplicationItem } from "../types";

import { USER_APPS_COLUMN_PRESETS } from "../table/apps.presets";
import { buildUserAppsColumns } from "../table/apps.columns";
import {
  getSearchTexts,
  matchFilters,
  getSortValue,
} from "../table/apps.helpers";

export type UserApplicationsFilters = Record<string, any>;

export function useUserApplicationsTable(params: {
  username: string | null | undefined;

  /**
   * ✅ 当表格内发生“会影响上层详情/外部列表”的变更时通知上层
   * 典型：删除报名/加分记录后，需要刷新上半部分详情（分数/次数）以及关闭抽屉后的用户列表
   */
  onAfterMutate?: () => void | Promise<void>;
}) {
  const username = String(params.username ?? "").trim();

  const q = useTableQuery<UserApplicationsFilters>({});
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  const fetchAll: TableFetcher<
    UsernameApplicationItem,
    UserApplicationsFilters
  > = useCallback(async () => {
    // ✅ username 没有时不请求（避免打无意义接口）
    if (!username) return { list: [], total: 0 };

    const list = await getUsernameApplications(username);
    const safe = Array.isArray(list) ? list : [];
    return { list: safe, total: safe.length };
  }, [username]);

  // ✅ 仍然保持 reload 模式（本地分页/筛选/搜索不触发请求）
  const d = useTableData<UsernameApplicationItem, UserApplicationsFilters>(
    query,
    fetchAll,
    { autoDeps: "reload" },
  );

  // ✅ 关键修复：username 从空 -> 有值时，必须主动 reload
  const prevUsernameRef = useRef<string>("");
  useEffect(() => {
    if (prevUsernameRef.current === username) return;
    prevUsernameRef.current = username;

    reset();
    // ✅ 只有 username 有值时才 reload（否则就是空拉）
    if (username) {
      d.reload();
    }
  }, [username, reset, d]);

  const local = useMemo(() => {
    return applyLocalQuery<UsernameApplicationItem, UserApplicationsFilters>(
      d.list ?? [],
      query,
      { getSearchTexts, matchFilters, getSortValue },
    );
  }, [d.list, query]);

  const prefs = useColumnPrefs<UsernameApplicationItem>(
    "rbac.user.applications",
    USER_APPS_COLUMN_PRESETS,
  );

  const del = useAsyncMapAction<number, string>({
    successMessage: (_id, result) => String(result ?? "").trim() || "删除成功",
    errorMessage: "删除失败",
  });

  const deleteRow = useCallback(
    (row: UsernameApplicationItem) => {
      const rowId = Number((row as any)?.id);
      if (!Number.isFinite(rowId)) return;

      return del.run(rowId, async () => {
        const serverMsg = await deleteApply(rowId);

        // ✅ 1) 先刷新下半部分表格（保持你原逻辑）
        await d.reload();

        // ✅ 2) 通知上层：刷新“用户详情上半部分/外部列表”等
        await params.onAfterMutate?.();

        return serverMsg;
      });
    },
    [del, d, params],
  );

  const columns = useMemo(() => {
    const base = buildUserAppsColumns({
      onDelete: deleteRow,
      isDeleting: (id) => del.isLoading(id),
    });

    return prefs.applyPresetsToAntdColumns(base as any);
  }, [prefs, deleteRow, del]);

  const exp = useLocalExport<UsernameApplicationItem>(
    local.filtered,
    USER_APPS_COLUMN_PRESETS,
    prefs.visibleKeys,
    { filenameBase: `用户活动列表-${username || "未知用户"}` },
  );

  const onQueryChange = useCallback(
    (next: Partial<TableQuery<UserApplicationsFilters>>) => {
      if (typeof next.page === "number") setPage(next.page, next.pageSize);
      else if (typeof next.pageSize === "number")
        setPage(query.page, next.pageSize);

      if ("sorter" in next) setSorter(next.sorter);
      if ("filters" in next) setFilters(next.filters);
      if ("keyword" in next) setKeyword(next.keyword);
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    table: {
      rows: local.list,
      total: local.total,

      loading: d.loading,
      error: d.error,
      reload: d.reload,

      query,
      onQueryChange,
      setKeyword,

      // ✅ reset 也要带 reload（否则你重置后仍然是空）
      reset: () => {
        reset();
        if (username) d.reload();
      },

      exportCsv: exp.exportCsv,
      exporting: exp.exporting,
    },

    columns,
    columnPrefs: prefs,
    presets: USER_APPS_COLUMN_PRESETS,
  };
}
