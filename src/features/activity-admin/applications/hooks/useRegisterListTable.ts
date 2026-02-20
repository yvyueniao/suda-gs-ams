// src/features/activity-admin/applications/hooks/useRegisterListTable.ts

/**
 * useRegisterListTable
 *
 * 职责：
 * - ActivityAdminDetailPage 子区块：报名人员列表（Registers）
 * - 数据源：POST /activity/activityRegisters（按 activityId）
 * - 能力：前端本地 搜索/筛选/排序/分页 + 列设置持久化 + CSV 导出 + 列宽拖拽（由页面 SmartTable 开启）
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message / 不 Modal）
 * - ✅ 全量拉取后端列表，然后 applyLocalQuery 本地处理（符合你们通用表格体系）
 * - ✅ autoDeps="reload"：避免 query 变化导致重复请求
 */

import { useCallback, useMemo } from "react";

import type { TableQuery } from "../../../../shared/components/table";
import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../../shared/components/table";

import type { RegisterRow } from "../types";
import { fetchActivityRegisters } from "../api";

import { activityAdminRegistersColumnPresets } from "../table/registers/presets";
import { buildRegistersLocalQueryOptions } from "../table/registers/helpers";

export function useRegisterListTable(activityId: number) {
  /**
   * 0️⃣ 入参兜底：activityId 非法时，不请求，表格返回空态
   */
  const validId = Number.isFinite(activityId) && activityId > 0;

  /**
   * 1️⃣ 查询状态（keyword / page / sorter / filters）
   */
  const q = useTableQuery<Record<string, any>>();
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  /**
   * 2️⃣ 拉取后端全量数据（全量模式：仅首次 + reload 时拉）
   */
  const d = useTableData<RegisterRow, Record<string, any>>(
    query,
    async () => {
      if (!validId) return { list: [], total: 0 };
      const list = await fetchActivityRegisters({ activityId });
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页
   */
  const localOptions = useMemo(() => buildRegistersLocalQueryOptions(), []);
  const local = useMemo(() => {
    return applyLocalQuery<RegisterRow, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 列偏好（显隐 / 顺序 / 宽度）
   * bizKey：activity.admin.registers（页面 SmartTable.bizKey 需要一致）
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<RegisterRow>(
    "activity.admin.registers",
    activityAdminRegistersColumnPresets,
  );

  /**
   * 5️⃣ CSV 导出（基于 filtered：过滤+排序后的全量结果，不受分页影响）
   */
  const exp = useLocalExport<RegisterRow>(
    local.filtered,
    activityAdminRegistersColumnPresets,
    visibleKeys,
    { filenameBase: "报名人员列表" },
  );

  /**
   * 6️⃣ SmartTable 桥接：写回 query
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      // 分页
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      // 排序
      if ("sorter" in next) setSorter(next.sorter);

      // 筛选
      if ("filters" in next) setFilters(next.filters);

      // 搜索
      if ("keyword" in next) setKeyword(next.keyword);
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    // data for table
    rows: local.list,
    total: local.total,

    // request state
    loading: d.loading,
    error: d.error,
    reload: d.reload,

    // query + setters
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
