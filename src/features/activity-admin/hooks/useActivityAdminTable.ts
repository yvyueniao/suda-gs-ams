// src/features/activity-admin/hooks/useActivityAdminTable.ts

/**
 * useActivityAdminTable
 *
 * 职责：
 * - 负责“活动/讲座管理列表”的表格编排
 * - 数据源：只拉取当前用户能管理的活动（/activity/ownActivity）
 * - 接入通用表格体系（query / data / applyLocalQuery / export / columnPrefs）
 *
 * V1 范围：
 * - 全量拉取 ownActivity
 * - 本地搜索 / 筛选 / 排序 / 分页
 * - 列设置持久化（显隐 / 顺序 / 宽度）
 * - CSV 导出（基于 filtered：过滤+排序后的全量结果）
 *
 * 不负责：
 * - 创建 / 修改 / 删除动作（交给 useActivityAdminPage 或页面层编排）
 */

import { useCallback, useMemo } from "react";

import type { TableQuery } from "../../../shared/components/table";
import {
  useTableQuery,
  useTableData,
  applyLocalQuery,
  useLocalExport,
  useColumnPrefs,
} from "../../../shared/components/table";

import type { ManageableActivityItem } from "../types";
import { fetchOwnActivities } from "../api";
import { activityAdminColumnPresets } from "../table/presets";
import { buildActivityAdminLocalQueryOptions } from "../table/helpers";

export function useActivityAdminTable() {
  /**
   * 1️⃣ 查询状态（keyword / page / sorter / filters）
   * ✅ 注意：useTableQuery 返回的是 { query, setXxx... }，不是 TableQuery 本体
   */
  const q = useTableQuery<Record<string, any>>();

  // ✅ 关键：把会用于 callback 的字段解构出来，避免依赖 [q] 导致 callback 每次 render 都变
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  /**
   * 2️⃣ 拉取后端全量数据（全量模式：仅首次 + reload 时拉）
   * ✅ autoDeps="reload"：避免 query 变化导致反复请求
   */
  const d = useTableData<ManageableActivityItem, Record<string, any>>(
    query,
    async () => {
      const list = await fetchOwnActivities();
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页（applyLocalQuery 返回：filtered/total/list）
   */
  const localOptions = useMemo(() => buildActivityAdminLocalQueryOptions(), []);

  const local = useMemo(() => {
    return applyLocalQuery<ManageableActivityItem, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 列偏好（显隐 / 顺序 / 宽度）
   * bizKey：activity.admin（与页面 SmartTable.bizKey 保持一致）
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<ManageableActivityItem>(
    "activity.admin",
    activityAdminColumnPresets,
  );

  /**
   * 5️⃣ CSV 导出（必须基于 filtered：过滤/排序后的全量结果，不受分页影响）
   */
  const exp = useLocalExport<ManageableActivityItem>(
    local.filtered,
    activityAdminColumnPresets,
    visibleKeys,
    { filenameBase: "活动管理列表" },
  );

  /**
   * 6️⃣ SmartTable 桥接：SmartTable 只回传分页/排序/筛选（Partial<TableQuery>）
   * ✅ 关键：依赖写到具体 setXxx 上，避免 [q] 造成 callback 抖动
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      // 分页
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        // 只改 pageSize（兜底）
        setPage(query.page, next.pageSize);
      }

      // 排序
      if ("sorter" in next) {
        setSorter(next.sorter);
      }

      // 筛选（你本模块只处理 type/state，但 query.filters 仍是唯一真相源）
      if ("filters" in next) {
        setFilters(next.filters);
      }

      // 关键词（本模块 keyword 只匹配 name，匹配规则在 helpers 里）
      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    // data for table
    rows: local.list, // 当前页数据
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
