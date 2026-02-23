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
import { getSearchTexts, matchFilters, getSortValue } from "../table/helpers";

/**
 * ✅ 筛选字段口径必须对齐 antd：
 * FilterValue = (Key | boolean)[] | null
 *
 * 恢复筛选：department / role / invalid
 */
export type AdminMemberFilters = {
  department?: FilterValue;
  role?: FilterValue;
  invalid?: FilterValue;
};

export function useAdminMembersTable(params: {
  onDelete: (record: DepartmentMemberItem) => void | Promise<unknown>;
  departmentFilters?: { text: string; value: string }[];
}) {
  const { onDelete, departmentFilters } = params;

  // ✅ 用 ref 吸收 onDelete 的抖动，避免 columns 每次 render 重建
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  // ✅ query：唯一真相源
  const q = useTableQuery<AdminMemberFilters>({
    initial: { page: 1, pageSize: 10 },
  });

  // ✅ 解构：避免依赖 [q] 导致回调抖动
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  // ✅ 用 ref 保存当前页，避免 onQueryChange 依赖 query.page
  const pageRef = useRef(query.page);
  useEffect(() => {
    pageRef.current = query.page;
  }, [query.page]);

  const fetchAll: TableFetcher<DepartmentMemberItem, AdminMemberFilters> =
    useCallback(async () => {
      const rows = await getAllDepartmentMembers();
      const list = Array.isArray(rows) ? rows : [];
      return { list, total: list.length };
    }, []);

  // ✅ options 稳定：全量模式仅首次 + reload 拉
  const tableDataOptions = useMemo(() => ({ autoDeps: "reload" as const }), []);
  const d = useTableData(query, fetchAll, tableDataOptions);

  /**
   * ✅ 本地查询：分页 / 搜索 / 筛选 / 排序
   */
  const local = useMemo(() => {
    return applyLocalQuery<DepartmentMemberItem, AdminMemberFilters>(
      d.list,
      query,
      {
        getSearchTexts,
        matchFilters,
        getSortValue,
      },
    );
  }, [d.list, query]);

  const prefs = useColumnPrefs<DepartmentMemberItem>(
    "rbac.admin.members",
    ADMIN_MEMBER_COLUMN_PRESETS,
  );

  // ✅ columns：只依赖 departmentFilters + prefs（onDelete 用 ref 调用）
  // ✅ width 统一由 presets 控制：columns.tsx 不再写 width
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
        setPage(pageRef.current, next.pageSize);
      }

      // sorter
      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }

      // filters
      if ("filters" in next) {
        setFilters(next.filters);
      }

      // keyword
      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword],
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
