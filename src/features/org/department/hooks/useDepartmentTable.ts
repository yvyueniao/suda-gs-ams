// src/features/org/department/hooks/useDepartmentTable.ts

/**
 * useDepartmentTable
 *
 * 职责：
 * - 负责部门列表的“表格编排”
 * - 接入通用表格体系（query / data / applyLocalQuery / export / columnPrefs）
 *
 * V1 范围：
 * - 全量拉取部门列表
 * - 本地搜索 / 排序 / 分页
 * - 列设置持久化
 * - CSV 导出（基于 filtered）
 *
 * 不负责：
 * - 创建 / 删除动作（由 useDepartmentManage 编排）
 */

import { useCallback, useMemo } from "react";

import {
  useTableQuery,
  useTableData,
  applyLocalQuery,
  useLocalExport,
  useColumnPrefs,
} from "../../../../shared/components/table";

import type { TableQuery } from "../../../../shared/components/table";
import type { DepartmentItem } from "../types";
import { fetchAllDepartments } from "../api";
import { departmentColumnPresets } from "../table/presets";
import { buildDepartmentLocalQueryOptions } from "../table/helpers";

export function useDepartmentTable() {
  /**
   * 1️⃣ 查询状态（keyword / page / sorter / filters）
   * ✅ 注意：useTableQuery 返回的是 { query, setXxx... }，不是 TableQuery 本体
   */
  const q = useTableQuery<Record<string, any>>();

  // ✅ 关键：把会用于 callback 的字段解构出来，避免依赖 [q] 造成“每次 render 都变”
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  /**
   * 2️⃣ 拉取后端全量数据（全量模式：仅首次 + reload 时拉）
   * ✅ autoDeps="reload"：避免 query 变化导致反复请求
   */
  const d = useTableData<DepartmentItem, Record<string, any>>(
    query,
    async () => {
      const list = await fetchAllDepartments();
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页（applyLocalQuery 返回：filtered/total/list）
   */
  const localOptions = useMemo(() => buildDepartmentLocalQueryOptions(), []);

  const local = useMemo(() => {
    return applyLocalQuery<DepartmentItem, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 列偏好（显隐 / 顺序 / 宽度）
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<DepartmentItem>("org.department", departmentColumnPresets);

  /**
   * 5️⃣ CSV 导出（必须基于 filtered：过滤/排序后的全量结果）
   */
  const exp = useLocalExport<DepartmentItem>(
    local.filtered,
    departmentColumnPresets,
    visibleKeys,
    { filenameBase: "部门列表" },
  );

  /**
   * 6️⃣ 给 SmartTable 用的桥接：SmartTable 只回传分页/排序（Partial<TableQuery>）
   * ✅ 关键：依赖写到具体函数上，避免 [q] 导致 callback 每次都变
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        // 只改 pageSize（兜底）
        setPage(query.page, next.pageSize);
      }

      if ("sorter" in next) {
        setSorter(next.sorter);
      }

      if ("filters" in next) {
        setFilters(next.filters);
      }

      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    // data for table
    rows: local.list, // 当前页
    total: local.total,

    // raw request state
    loading: d.loading,
    error: d.error,
    reload: d.reload,

    // query state + setters（Toolbar/SmartTable 都会用）
    query,
    setKeyword,
    setFilters,
    reset,
    onQueryChange,

    // column settings
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,

    // export
    exporting: exp.exporting,
    exportCsv: exp.exportCsv,
  };
}
