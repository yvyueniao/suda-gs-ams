// src/features/activity-admin/applications/hooks/useSupplementListTable.ts

/**
 * useSupplementListTable
 *
 * 职责：
 * - ActivityAdminDetailPage 子区块：补报名人员列表（Supplements）
 * - 数据源：POST /activity/activitySupplements（按 activityId）
 * - 能力：
 *    - 前端本地 搜索 / 筛选 / 排序 / 分页
 *    - 列设置持久化
 *    - CSV 导出
 *    - 审核动作（通过 / 不通过，带行级 loading）
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message / 不 Modal）
 * - ✅ 全量拉取后端列表，然后 applyLocalQuery 本地处理
 * - ✅ autoDeps="reload"：避免 query 变化导致重复请求
 * - ✅ 审核成功后自动 reload()
 * - ✅ 审核动作返回后端 data（string），供页面层 toast 使用（如需要）
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

import { useAsyncMapAction } from "../../../../shared/actions";

import type { SupplementRow } from "../types";
import { fetchActivitySupplements, examineSupplement } from "../api";

import { activityAdminSupplementsColumnPresets } from "../table/supplements/presets";
import { buildSupplementsLocalQueryOptions } from "../table/supplements/helpers";

export function useSupplementListTable(activityId: number) {
  /**
   * 0️⃣ 入参兜底
   */
  const validId = Number.isFinite(activityId) && activityId > 0;

  /**
   * 1️⃣ 查询状态
   */
  const q = useTableQuery<Record<string, any>>();
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  /**
   * 2️⃣ 拉取全量数据
   */
  const d = useTableData<SupplementRow, Record<string, any>>(
    query,
    async () => {
      if (!validId) return { list: [], total: 0 };
      const list = await fetchActivitySupplements({ activityId });
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页
   */
  const localOptions = useMemo(() => buildSupplementsLocalQueryOptions(), []);
  const local = useMemo(() => {
    return applyLocalQuery<SupplementRow, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 审核动作（按 username 维度 loading）
   * - 不在 hook 里 toast；但把后端 msg 返回给页面层
   */
  const audit = useAsyncMapAction<string, string>({
    silentUnauthorized: true,
  });

  const isAuditing = useCallback(
    (username: string) => audit.isLoading(username),
    [audit],
  );

  const approve = useCallback(
    async (row: SupplementRow) => {
      const serverMsg = await audit.run(row.username, async () => {
        return await examineSupplement({
          activityId: row.activityId,
          username: row.username,
          view: 0, // 通过
        });
      });

      await d.reload();
      return serverMsg;
    },
    [audit, d],
  );

  const reject = useCallback(
    async (row: SupplementRow) => {
      const serverMsg = await audit.run(row.username, async () => {
        return await examineSupplement({
          activityId: row.activityId,
          username: row.username,
          view: 5, // 不通过
        });
      });

      await d.reload();
      return serverMsg;
    },
    [audit, d],
  );

  /**
   * 5️⃣ 列偏好
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<SupplementRow>(
    "activity.admin.supplements",
    activityAdminSupplementsColumnPresets,
  );

  /**
   * 6️⃣ CSV 导出
   */
  const exp = useLocalExport<SupplementRow>(
    local.filtered,
    activityAdminSupplementsColumnPresets,
    visibleKeys,
    { filenameBase: "补报名人员列表" },
  );

  /**
   * 7️⃣ SmartTable 桥接
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      if ("sorter" in next) setSorter(next.sorter);
      if ("filters" in next) setFilters(next.filters);
      if ("keyword" in next) setKeyword(next.keyword);
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    // data
    rows: local.list,
    total: local.total,

    // request state
    loading: d.loading,
    error: d.error,
    reload: d.reload,

    // query
    query,
    setKeyword,
    setFilters,
    reset,
    onQueryChange,

    // column prefs
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,

    // export
    exporting: exp.exporting,
    exportCsv: exp.exportCsv,

    // audit actions
    approve,
    reject,
    isAuditing,
  };
}
