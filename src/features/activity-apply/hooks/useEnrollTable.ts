// src/features/activity-apply/hooks/useEnrollTable.ts

import { useCallback, useMemo } from "react";
import type {
  ListResult,
  TableFetcher,
  TableQuery,
} from "../../../shared/components/table";
import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../shared/components/table";

import type { FilterValue } from "antd/es/table/interface";

import { getMyApplications, searchAllActivities } from "../api";
import type { EnrollTableRow } from "../types";
import { buildEnrollColumns } from "../table/columns";
import { activityApplyTablePresets } from "../table/presets";
import {
  type EnrollTableFilters,
  mergeEnrollRows,
  getSearchTexts,
  matchFilters,
  getSortValue,
} from "../table/helpers";
import { useApplyActions } from "./useApplyActions";

function normalizeAntdFilters<F extends Record<string, any>>(
  filters: Record<string, FilterValue | null>,
): Partial<F> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(filters ?? {})) {
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v; // 保留数组（兼容单选/多选）
  }
  return out as Partial<F>;
}

export function useEnrollTable(options?: {
  onOpenDetail?: (id: number) => void;

  /** ✅ 报名按钮点击：页面层接入 useApplyFlow 后传 startRegister 进来 */
  onRegister?: (row: EnrollTableRow) => void | Promise<unknown>;

  /**
   * ✅ 允许外部注入 applyActions（关键：避免你 useEnrollPage 里那套 actions/flow 和这里不一致）
   */
  applyActions?: ReturnType<typeof useApplyActions>;
}) {
  const bizKey = "activityApply.list";

  const {
    query,
    setKeyword,
    setFilters,
    setPage,
    setSorter,
    reset: resetQuery,
  } = useTableQuery<EnrollTableFilters>({
    initial: {
      page: 1,
      pageSize: 10,
      keyword: undefined,
      filters: {},
      sorter: undefined,
    },
  });

  const fetcher: TableFetcher<EnrollTableRow, EnrollTableFilters> = useCallback(
    async (
      _q: TableQuery<EnrollTableFilters>,
    ): Promise<ListResult<EnrollTableRow>> => {
      const [activities, myApps] = await Promise.all([
        searchAllActivities(),
        getMyApplications(),
      ]);
      const list = mergeEnrollRows(activities ?? [], myApps ?? []);
      return { list, total: list.length };
    },
    [],
  );

  const tableData = useTableData<EnrollTableRow, EnrollTableFilters>(
    query,
    fetcher,
    { autoDeps: "reload" },
  );

  const local = useMemo(() => {
    return applyLocalQuery<EnrollTableRow, EnrollTableFilters>(
      tableData.list ?? [],
      query,
      { getSearchTexts, matchFilters, getSortValue },
    );
  }, [tableData.list, query]);

  const columnPrefs = useColumnPrefs<EnrollTableRow>(
    bizKey,
    activityApplyTablePresets,
    { version: 3 },
  );

  // ✅ 关键：优先用外部注入的 applyActions（同一套 loading / 同一套错误策略）
  const innerActions = useApplyActions({
    onChanged: async () => {
      await tableData.reload();
    },
    muteActionErrorToast: true,
  });
  const applyActions = options?.applyActions ?? innerActions;

  const columns = useMemo(() => {
    const base = buildEnrollColumns({
      onDetail: (row) => options?.onOpenDetail?.(row.id),

      // ✅ 报名入口：优先走页面层传入（弹窗 flow），否则默认直接 register（无弹窗）
      onRegister: async (row) => {
        if (options?.onRegister) return options.onRegister(row);
        return applyActions.register(row.id);
      },

      onCancel: async (row) => {
        await applyActions.cancel(row.id);
      },

      isRegistering: (id) => applyActions.rowAction.isLoading(id),
      isCanceling: (id) => applyActions.rowAction.isLoading(id),
    });

    return columnPrefs.applyPresetsToAntdColumns(base);
  }, [options?.onOpenDetail, options?.onRegister, applyActions, columnPrefs]);

  const exporter = useLocalExport<EnrollTableRow>(
    local.filtered,
    activityApplyTablePresets,
    columnPrefs.visibleKeys,
    { filenameBase: "活动讲座报名列表" },
  );

  const onQueryChange = useCallback(
    (next: Partial<TableQuery<EnrollTableFilters>>) => {
      if (next.page !== undefined || next.pageSize !== undefined) {
        setPage(next.page ?? query.page, next.pageSize ?? query.pageSize);
      }
      if ("sorter" in next) setSorter(next.sorter);
      if ("keyword" in next) setKeyword(next.keyword);
    },
    [query.page, query.pageSize, setPage, setSorter, setKeyword],
  );

  const onFiltersChange = useCallback(
    (antdFilters: Record<string, FilterValue | null>) => {
      setFilters(normalizeAntdFilters<EnrollTableFilters>(antdFilters));
      setPage(1, query.pageSize);
    },
    [setFilters, setPage, query.pageSize],
  );

  return {
    table: {
      bizKey,
      columns,
      dataSource: local.list,
      rowKey: "id" as const,
      total: local.total,
      loading: tableData.loading,
      error: tableData.error,
      query,

      onQueryChange,
      onFiltersChange,

      setKeyword,
      resetQuery,
      reload: tableData.reload,

      columnPrefs,
      exportCsv: exporter.exportCsv,
    },

    applyActions,
  };
}
