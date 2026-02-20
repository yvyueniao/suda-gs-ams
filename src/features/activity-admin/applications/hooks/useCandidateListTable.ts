// src/features/activity-admin/applications/hooks/useCandidateListTable.ts

/**
 * useCandidateListTable
 *
 * 职责：
 * - ActivityAdminDetailPage 子区块：候补人员列表（Candidates）
 * - 数据源：POST /activity/activityCandidates（按 activityId）
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

import type { CandidateRow } from "../types";
import { fetchActivityCandidates } from "../api";

import { activityAdminCandidatesColumnPresets } from "../table/candidates/presets";
import { buildCandidatesLocalQueryOptions } from "../table/candidates/helpers";

export function useCandidateListTable(activityId: number) {
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
  const d = useTableData<CandidateRow, Record<string, any>>(
    query,
    async () => {
      if (!validId) return { list: [], total: 0 };
      const list = await fetchActivityCandidates({ activityId });
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页
   */
  const localOptions = useMemo(() => buildCandidatesLocalQueryOptions(), []);
  const local = useMemo(() => {
    return applyLocalQuery<CandidateRow, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 列偏好（显隐 / 顺序 / 宽度）
   * bizKey：activity.admin.candidates（页面 SmartTable.bizKey 需要一致）
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<CandidateRow>(
    "activity.admin.candidates",
    activityAdminCandidatesColumnPresets,
  );

  /**
   * 5️⃣ CSV 导出（基于 filtered：过滤+排序后的全量结果，不受分页影响）
   */
  const exp = useLocalExport<CandidateRow>(
    local.filtered,
    activityAdminCandidatesColumnPresets,
    visibleKeys,
    { filenameBase: "候补人员列表" },
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
