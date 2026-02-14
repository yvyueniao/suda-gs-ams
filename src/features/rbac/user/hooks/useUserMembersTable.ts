// src/features/rbac/user/hooks/useUserMembersTable.ts

import { useCallback, useEffect, useMemo, useRef } from "react";
import { message } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import type {
  TableFetcher,
  TableQuery,
  TableSorter,
} from "../../../../shared/components/table";

import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../../shared/components/table";

import { getUserPages } from "../api";
import type { UserListItem } from "../types";

import { USER_COLUMN_PRESETS } from "../table/presets";
import { buildUserColumns } from "../table/columns";
import { getSearchTexts, matchFilters, getSortValue } from "../table/helpers";

/**
 * ✅ 筛选字段（对齐 antd FilterValue 口径）
 * - 你当前要求只做：账号状态 invalid、角色 role
 */
export type UserFilters = {
  role?: FilterValue;
  invalid?: FilterValue;
};

export function useUserMembersTable(params: {
  onUnlock: (record: UserListItem) => void | Promise<unknown>;
  onDetail: (record: UserListItem) => void | Promise<unknown>;
}) {
  const { onUnlock, onDetail } = params;

  // ✅ 用 ref 吸收回调抖动，避免 columns 每次 render 重建
  const onUnlockRef = useRef(onUnlock);
  const onDetailRef = useRef(onDetail);

  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    onDetailRef.current = onDetail;
  }, [onDetail]);

  // ======================================================
  // 1) query：唯一真相源（后端分页）
  // ======================================================
  const q = useTableQuery<UserFilters>({
    initial: { page: 1, pageSize: 10 },
  });

  // ✅ 解构：避免依赖 [q] 导致回调抖动
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  // ======================================================
  // 2) fetcher：只把 page/pageSize/keyword 传给后端
  // - 后端字段：pageNum/pageSize/key
  // - 后端只分页，不负责筛选/排序
  // ======================================================
  const fetchPage: TableFetcher<UserListItem, UserFilters> = useCallback(
    async (qq) => {
      const { list, total } = await getUserPages({
        pageNum: qq.page,
        pageSize: qq.pageSize,
        key: qq.keyword?.trim() ? qq.keyword.trim() : undefined,
      });

      return { list, total };
    },
    [],
  );

  // ✅ 后端分页：query 变更自动请求
  const tableDataOptions = useMemo(() => ({ autoDeps: "query" as const }), []);
  const d = useTableData(query, fetchPage, tableDataOptions);

  // ======================================================
  // 3) 本地查询：仅对“当前页数据”做 keyword/filters/sorter
  // ⚠️ 注意：
  // - 因为分页在后端，这里不能再做二次分页
  // - 所以我们把 page/pageSize 临时改成“全量展示当前页”
  // ======================================================
  const local = useMemo(() => {
    const noPagingQuery = {
      ...query,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    };

    return applyLocalQuery<UserListItem, UserFilters>(d.list, noPagingQuery, {
      getSearchTexts,
      matchFilters,
      getSortValue,
    });
  }, [d.list, query]);

  // ======================================================
  // 4) 列偏好
  // ======================================================
  const prefs = useColumnPrefs<UserListItem>(
    "rbac.user.members",
    USER_COLUMN_PRESETS,
  );

  // ======================================================
  // 5) columns：只依赖 prefs（回调通过 ref 调用）
  // ======================================================
  const columns = useMemo(() => {
    const raw = buildUserColumns({
      onUnlock: (record) => onUnlockRef.current(record),
      onDetail: (record) => onDetailRef.current(record),
    });

    return prefs.applyPresetsToAntdColumns(raw);
  }, [prefs]);

  // ======================================================
  // 6) 导出：当前页（过滤/排序后的）结果导出
  // - 后端分页“全量导出”后续可以换 useTableExport.exportAll()
  // ======================================================
  const exportOptions = useMemo(
    () => ({
      filenameBase: "用户管理-当前页",
      notify: (type: "success" | "error" | "info", text: string) => {
        if (type === "success") message.success(text);
        else if (type === "error") message.error(text);
        else message.info(text);
      },
    }),
    [],
  );

  const exp = useLocalExport(
    local.filtered,
    USER_COLUMN_PRESETS,
    prefs.visibleKeys,
    exportOptions,
  );

  // ======================================================
  // 7) onQueryChange：受控回写（对齐你们“成功写法”）
  // ======================================================
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<UserFilters>>) => {
      // page / pageSize
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      // sorter（只影响当前页排序）
      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }

      // filters（只影响当前页筛选）
      if ("filters" in next) {
        setFilters(next.filters);
      }

      // keyword（会触发后端重新分页查询 + 当前页本地筛选）
      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    table: {
      // 当前页经过本地筛选/排序后的 rows
      rows: local.list,

      // ⚠️ total 使用后端 total（分页由后端决定）
      total: d.total,

      // 可选：给页面层若要做“当前页过滤后数量提示”
      filtered: local.filtered,

      loading: d.loading,
      error: d.error,
      reload: d.reload,

      query,
      onQueryChange,

      setKeyword,
      reset,

      exportCsv: exp.exportCsv,
      exporting: exp.exporting,
    },

    columns,
    columnPrefs: prefs,
    presets: USER_COLUMN_PRESETS,
  };
}
