// src/features/profile/hooks/useProfileMyActivitiesTable.ts
import { useCallback, useMemo, useState } from "react";
import type { FilterValue, Key } from "antd/es/table/interface";
import type { ColumnsType, ColumnType } from "antd/es/table";

import {
  useTableQuery,
  useTableData,
  useColumnPrefs,
  useLocalExport,
  type TableQuery,
  type TableSorter,
} from "../../../shared/components/table";

import type {
  ActivityDetail,
  MyActivityFilters,
  MyActivityItem,
  ActivityType,
  ApplicationState,
} from "../types";
import { getMyApplications, getActivityDetail } from "../api";

import { myActivitiesTablePresets } from "../table/presets";
import {
  buildMyActivitiesColumns,
  type MyActivitiesActions,
} from "../table/columns";
import { queryMyActivities, mapMyActivityForExport } from "../table/helpers";

const BIZ_KEY = "profile.myActivities";

/** 把 antd 的 filter value 归一成你们的字段类型 */
function normalizeFilterValue<T>(
  raw: unknown,
  kind: "number" | "boolean",
): T | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (kind === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return (Number.isFinite(n) ? (n as any) : undefined) as T | undefined;
  }

  if (typeof raw === "boolean") return raw as any;
  if (raw === "true") return true as any;
  if (raw === "false") return false as any;
  return undefined;
}

/** 把 query.filters 的单值映射成 antd filteredValue（单选列） */
function toFilteredValue(v: unknown): FilterValue | null {
  return v === undefined ? null : ([v] as Key[]);
}

type ColumnWithFilteredValue<T> = ColumnType<T> & {
  filteredValue?: FilterValue | null;
};

export function useProfileMyActivitiesTable() {
  // 1) 查询状态（统一 TableQuery）
  const {
    query,
    setPage,
    setSorter,
    setFilters,
    setKeyword,
    reset: resetQuery,
  } = useTableQuery<MyActivityFilters>({
    initial: {
      page: 1,
      pageSize: 10,
      keyword: "",
      filters: undefined,
      sorter: undefined,
    },
  });

  // 2) 拉全量数据（全量模式：fetcher 忽略 page/pageSize）
  const fetcher = useCallback(async (_q: TableQuery<MyActivityFilters>) => {
    const rows = await getMyApplications();
    return { list: rows, total: rows.length };
  }, []);

  const {
    list: rawRows,
    loading,
    error,
    reload,
  } = useTableData<MyActivityItem, MyActivityFilters>(query, fetcher, {
    auto: true,
    autoDeps: "reload", // ✅ 全量拉取 + 本地查询：query 变化不重复请求，只在首次+手动 reload 时请求
  });

  // 3) 本地查询引擎（filtered / total / list）
  const { filtered, total, list } = useMemo(
    () => queryMyActivities(rawRows ?? [], query),
    [rawRows, query],
  );

  // 4) 列预设 + 列偏好（显隐/顺序/宽度持久化）
  const presets = myActivitiesTablePresets;

  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault: resetColumns,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<MyActivityItem>(BIZ_KEY, presets, { version: 1 });

  // 5) 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [currentRow, setCurrentRow] = useState<MyActivityItem | null>(null);

  const openDetail = useCallback(
    async (activityId: number) => {
      // ✅ 优先从当前 filtered（用户看到的全集）里找当前行，语义更一致
      const row =
        (filtered ?? []).find((x) => x.activityId === activityId) ?? null;
      setCurrentRow(row);

      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const d = await getActivityDetail(activityId);
        setDetail(d);
      } finally {
        setDetailLoading(false);
      }
    },
    [filtered],
  );

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailLoading(false);
    setDetail(null);
    setCurrentRow(null);
  }, []);

  // ✅ 兼容：仅获取详情数据（有些页面/旧逻辑会直接调用它）
  const fetchActivityDetail = useCallback(
    async (activityId: number) => getActivityDetail(activityId),
    [],
  );

  // 6) columns（用 presets 应用显隐/顺序/宽度；受控筛选闭环）
  const actions: MyActivitiesActions = useMemo(
    () => ({ openDetail }),
    [openDetail],
  );

  const baseColumns = useMemo(
    () => buildMyActivitiesColumns(actions),
    [actions],
  );

  // ✅ 受控筛选闭环：把 query.filters 映射回 antd 的 filteredValue（用映射表避免一堆 if）
  const controlledColumns = useMemo(() => {
    const f = query.filters;

    const filterMap: Record<string, unknown> = {
      type: f?.type,
      state: f?.state,
      checkIn: f?.checkIn,
      checkOut: f?.checkOut,
      getScore: f?.getScore,
    };

    const mapColumn = (
      c: ColumnType<MyActivityItem>,
    ): ColumnWithFilteredValue<MyActivityItem> => {
      const k = (c.dataIndex ?? c.key) as string | undefined;
      if (!k) return c as any;
      if (!(k in filterMap)) return c as any;
      return { ...c, filteredValue: toFilteredValue(filterMap[k]) };
    };

    return (baseColumns as ColumnsType<MyActivityItem>).map(mapColumn);
  }, [baseColumns, query.filters]);

  const columns = useMemo(
    () =>
      applyPresetsToAntdColumns(
        controlledColumns as ColumnsType<MyActivityItem>,
      ),
    [applyPresetsToAntdColumns, controlledColumns],
  );

  // 7) 导出（全量模式必须用 filtered）
  const {
    exporting,
    error: exportError,
    exportCsv: doExportCsv,
  } = useLocalExport<MyActivityItem>(filtered, presets, visibleKeys, {
    filenameBase: "我的活动报名记录",
    mapRow: (row) => mapMyActivityForExport(row),
  });

  const exportCsv = useCallback(() => {
    doExportCsv();
  }, [doExportCsv]);

  // 8) SmartTable 桥接：分页/排序回传（Partial TableQuery）
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<MyActivityFilters>>) => {
      if (typeof next.page === "number" || typeof next.pageSize === "number") {
        setPage(next.page ?? query.page, next.pageSize ?? query.pageSize);
      }
      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }
    },
    [query.page, query.pageSize, setPage, setSorter],
  );

  // 9) antd filters → MyActivityFilters（闭环）
  const onFiltersChange = useCallback(
    (antdFilters: Record<string, FilterValue | null>) => {
      const pickFirst = (v: FilterValue | null) => {
        if (!v || !Array.isArray(v) || v.length === 0) return undefined;
        return v[0];
      };

      const next: MyActivityFilters = {
        type: normalizeFilterValue<ActivityType>(
          pickFirst(antdFilters.type),
          "number",
        ),
        state: normalizeFilterValue<ApplicationState>(
          pickFirst(antdFilters.state),
          "number",
        ),
        checkIn: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.checkIn),
          "boolean",
        ),
        checkOut: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.checkOut),
          "boolean",
        ),
        getScore: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.getScore),
          "boolean",
        ),
      };

      const allEmpty = Object.values(next).every((x) => x === undefined);
      setFilters(allEmpty ? undefined : next);
    },
    [setFilters],
  );

  // 10) 重置（查询）
  const reset = useCallback(() => {
    resetQuery();
  }, [resetQuery]);

  return {
    // 表格基础
    bizKey: BIZ_KEY,
    presets,
    columns,
    list,
    total,
    loading,
    error,
    reload,

    // query
    query,
    setKeyword,
    setPage,
    setSorter,
    setFilters,
    reset,

    // SmartTable 事件桥接
    onQueryChange,
    onFiltersChange,

    // 列偏好
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetColumns,

    // 导出
    exporting,
    exportError,
    exportCsv,

    // 详情弹窗
    detailOpen,
    detailLoading,
    detail,
    currentRow,
    openDetail,
    closeDetail,

    // 兼容
    fetchActivityDetail,
  };
}
