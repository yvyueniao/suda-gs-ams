import { useCallback, useEffect, useMemo, useRef } from "react";
import { message } from "antd";

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
 * - invalid / role 全部移除
 */
export type AdminMemberFilters = {
  department?: string;
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

  const fetchAll: TableFetcher<DepartmentMemberItem, AdminMemberFilters> =
    useCallback(async (_query) => {
      const rows = await getAllDepartmentMembers();
      const list = Array.isArray(rows) ? rows : [];
      return { list, total: list.length };
    }, []);

  // ✅ options 稳定
  const tableDataOptions = useMemo(() => ({ autoDeps: "reload" as const }), []);
  const d = useTableData(q.query, fetchAll, tableDataOptions);

  /**
   * ✅ 本地查询：分页/搜索/筛选
   * - 只保留最基本筛选：department（matchFilters 内部只处理 department）
   * - 为了进一步止血，这里不再传 getSortValue（本地排序彻底不参与）
   */
  const local = useMemo(() => {
    return applyLocalQuery<DepartmentMemberItem, AdminMemberFilters>(
      d.list,
      q.query,
      {
        getSearchTexts,
        matchFilters,
        // 🚫 不传 getSortValue：禁用本地排序（更稳）
      },
    );
  }, [d.list, q.query]);

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

  const onQueryChange = useCallback(
    (next: Partial<TableQuery<AdminMemberFilters>>) => {
      // page / pageSize
      if (typeof next.page === "number" || typeof next.pageSize === "number") {
        q.setPage(next.page ?? q.query.page, next.pageSize ?? q.query.pageSize);
      }

      // sorter（仍然接，但本地排序已禁用；如果你也想彻底禁用排序，我可以再给你一版把这一段也删掉）
      if ("sorter" in next) q.setSorter(next.sorter as TableSorter | undefined);

      // filters（只剩 department）
      if ("filters" in next) q.setFilters(next.filters);

      // keyword
      if ("keyword" in next) q.setKeyword(next.keyword);
    },
    [q],
  );

  return {
    table: {
      rows: local.list,
      total: local.total,
      filtered: local.filtered,

      loading: d.loading,
      error: d.error,
      reload: d.reload,

      query: q.query,
      onQueryChange,

      setKeyword: q.setKeyword,
      reset: q.reset,

      exportCsv: exp.exportCsv,
      exporting: exp.exporting,
    },

    columns,
    columnPrefs: prefs,
    presets: ADMIN_MEMBER_COLUMN_PRESETS,
  };
}
