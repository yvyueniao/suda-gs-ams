// src/features/rbac/admin/hooks/useAdminMembersTable.ts

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

import { getAllDepartmentMembers } from "../api";
import type { DepartmentMemberItem } from "../types";

import { ADMIN_MEMBER_COLUMN_PRESETS } from "../table/presets";
import { buildAdminMemberColumns } from "../table/columns";
import { getSearchTexts, matchFilters } from "../table/helpers";

/**
 * ✅ 只保留最基本筛选：department
 * 关键修复：
 * - filters 在 antd 里是 FilterValue（数组或 null），不能写 string
 */
export type AdminMemberFilters = {
  department?: FilterValue; // ✅ (Key | boolean)[] | null
};

export function useAdminMembersTable(params: {
  onDelete: (record: DepartmentMemberItem) => void | Promise<unknown>;
  departmentFilters?: { text: string; value: string }[];
}) {
  const { onDelete, departmentFilters } = params;

  // ======================================================
  // ✅ 用 ref 吸收 onDelete 的抖动，避免 columns 每次 render 重建
  // ======================================================
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  // ✅ query：唯一真相源
  const q = useTableQuery<AdminMemberFilters>({
    initial: { page: 1, pageSize: 10 },
  });

  // ✅ 解构：严格对齐“部门管理页成功写法”，避免依赖 [q] 导致回调抖动
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  const fetchAll: TableFetcher<DepartmentMemberItem, AdminMemberFilters> =
    useCallback(async () => {
      const rows = await getAllDepartmentMembers();
      const list = Array.isArray(rows) ? rows : [];
      return { list, total: list.length };
    }, []);

  // ✅ options 稳定
  const tableDataOptions = useMemo(() => ({ autoDeps: "reload" as const }), []);
  const d = useTableData(query, fetchAll, tableDataOptions);

  /**
   * ✅ 本地查询：分页/搜索/筛选
   * - matchFilters 只处理 department（FilterValue 数组）
   * - 禁用本地排序：不传 getSortValue
   */
  const local = useMemo(() => {
    return applyLocalQuery<DepartmentMemberItem, AdminMemberFilters>(
      d.list,
      query,
      {
        getSearchTexts,
        matchFilters,
      },
    );
  }, [d.list, query]);

  const prefs = useColumnPrefs<DepartmentMemberItem>(
    "rbac.admin.members",
    ADMIN_MEMBER_COLUMN_PRESETS,
  );

  // ✅ columns：只依赖 departmentFilters + prefs（onDelete 用 ref 调用）
  const columns = useMemo(() => {
    const raw = buildAdminMemberColumns({
      departmentFilters,
      onDelete: (record) => onDeleteRef.current(record),
    });

    return prefs.applyPresetsToAntdColumns(raw);
  }, [departmentFilters, prefs]);

  // ✅ export options 稳定
  const exportOptions = useMemo(
    () => ({
      filenameBase: "管理员管理-部门成员",
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
    ADMIN_MEMBER_COLUMN_PRESETS,
    prefs.visibleKeys,
    exportOptions,
  );

  /**
   * ✅ onQueryChange：严格对齐“部门管理页成功写法”
   * - filters 原样透传（FilterValue 数组）
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<AdminMemberFilters>>) => {
      // page / pageSize
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      // sorter（你虽然禁用了本地排序，但 SmartTable 仍可能回传 sorter；保留不影响）
      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }

      // filters（只剩 department）
      if ("filters" in next) {
        setFilters(next.filters);
      }

      // keyword
      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    table: {
      rows: local.list,
      total: local.total,
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
    presets: ADMIN_MEMBER_COLUMN_PRESETS,
  };
}
