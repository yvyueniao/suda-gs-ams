// src/features/profile/hooks/useProfileMyActivitiesTable.ts

import { useCallback, useMemo, useRef, useState } from "react";
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

import { useAsyncMapAction } from "../../../shared/actions";

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

/** 把单个值归一化成 number/boolean */
function normalizeOne<T>(
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

/** 把 antd 的 FilterValue 归一成「数组」 */
function normalizeMany<T>(
  raw: FilterValue | null,
  kind: "number" | "boolean",
): T[] | undefined {
  if (!raw) return undefined;

  // antd: 多选是数组，单选也可能是数组（受控时我们也会喂数组）
  const arr = Array.isArray(raw) ? raw : [raw];

  const mapped = arr
    .map((x) => normalizeOne<T>(x, kind))
    .filter((x): x is T => x !== undefined);

  // 去重
  const uniq = Array.from(new Set(mapped as any[])) as T[];
  return uniq.length ? uniq : undefined;
}

/** 把 query.filters 的值映射成 antd filteredValue（支持单值/数组） */
function toFilteredValue(v: unknown): FilterValue | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v as Key[] as FilterValue; // ✅ 多选：原样喂回去
  return [v] as Key[];
}

type ColumnWithFilteredValue<T> = ColumnType<T> & {
  filteredValue?: FilterValue | null;
};

export function useProfileMyActivitiesTable() {
  // =====================================================
  // 1) 查询状态（统一 TableQuery）
  // =====================================================
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

  // =====================================================
  // 2) 拉全量数据（全量模式：fetcher 忽略 page/pageSize）
  // =====================================================
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
    autoDeps: "reload",
  });

  // =====================================================
  // 3) 本地查询引擎（filtered / total / list）
  // =====================================================
  const { filtered, total, list } = useMemo(() => {
    return queryMyActivities(rawRows ?? [], query);
  }, [rawRows, query]);

  // =====================================================
  // 4) 列预设 + 列偏好（显隐/顺序/宽度持久化）
  // =====================================================
  const presets = myActivitiesTablePresets;

  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault: resetColumns,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<MyActivityItem>(BIZ_KEY, presets, { version: 1 });

  // =====================================================
  // 5) 详情弹窗状态 + 防串线机制
  // =====================================================
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [currentRow, setCurrentRow] = useState<MyActivityItem | null>(null);

  const detailReqIdRef = useRef(0);

  const detailAction = useAsyncMapAction<number, void>({
    errorMessage: "加载详情失败",
  });

  const openDetail = useCallback<MyActivitiesActions["openDetail"]>(
    async (activityId: number) => {
      const reqId = ++detailReqIdRef.current;

      const row =
        (filtered ?? []).find((x) => x.activityId === activityId) ?? null;
      setCurrentRow(row);

      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      try {
        await detailAction.run(activityId, async () => {
          const d = await getActivityDetail(activityId);
          if (detailReqIdRef.current !== reqId) return;
          setDetail((d ?? null) as ActivityDetail | null);
        });
      } finally {
        if (detailReqIdRef.current === reqId) {
          setDetailLoading(false);
        }
      }
    },
    [detailAction, filtered],
  );

  const closeDetail = useCallback(() => {
    detailReqIdRef.current += 1;

    setDetailOpen(false);
    setDetailLoading(false);
    setDetail(null);
    setCurrentRow(null);
  }, []);

  const fetchActivityDetail = useCallback(
    async (activityId: number) => getActivityDetail(activityId),
    [],
  );

  // =====================================================
  // 6) columns：基础 columns + 受控筛选闭环 + presets 应用
  // =====================================================
  const actions: MyActivitiesActions = useMemo(
    () => ({ openDetail, detailAction }) as any,
    [openDetail, detailAction],
  );

  const baseColumns = useMemo(
    () => buildMyActivitiesColumns(actions),
    [actions],
  );

  const controlledColumns = useMemo(() => {
    const f = query.filters as any;

    // ✅ 注意：这里现在支持数组（多选），toFilteredValue 会原样喂回 antd
    const filterMap: Record<string, unknown> = {
      type: f?.type,
      state: f?.state,
      checkIn: f?.checkIn,
      checkOut: f?.checkOut,
      getScore: f?.getScore,
      canScore: f?.canScore, // ✅ 派生列也纳入受控回显（你新增了 canScore）
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

  const columns = useMemo(() => {
    return applyPresetsToAntdColumns(
      controlledColumns as ColumnsType<MyActivityItem>,
    );
  }, [applyPresetsToAntdColumns, controlledColumns]);

  // =====================================================
  // 7) 导出 CSV（全量模式必须用 filtered）
  // =====================================================
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

  // =====================================================
  // 8) SmartTable 桥接：分页/排序回传（Partial TableQuery）
  // =====================================================
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

  // =====================================================
  // 9) antd filters -> MyActivityFilters（闭环，支持多选）
  // =====================================================
  const onFiltersChange = useCallback(
    (antdFilters: Record<string, FilterValue | null>) => {
      // ✅ 多选：直接取数组（不要 pickFirst）
      const typeArr = normalizeMany<ActivityType>(antdFilters.type, "number");
      const stateArr = normalizeMany<ApplicationState>(
        antdFilters.state,
        "number",
      );
      const checkInArr = normalizeMany<boolean>(antdFilters.checkIn, "boolean");
      const checkOutArr = normalizeMany<boolean>(
        antdFilters.checkOut,
        "boolean",
      );
      const getScoreArr = normalizeMany<boolean>(
        antdFilters.getScore,
        "boolean",
      );
      const canScoreArr = normalizeMany<boolean>(
        (antdFilters as any).canScore,
        "boolean",
      );

      // ✅ “类型：活动/讲座”全选等价于不筛选（否则用户勾俩却只剩一种就很怪）
      const normalizedType =
        typeArr && typeArr.length >= 2 ? undefined : typeArr;

      // ✅ boolean 列：全选(true+false)也等价于不筛选
      const normalizeBoolAll = (arr?: boolean[]) =>
        arr && arr.length >= 2 ? undefined : arr;

      const next = {
        type: normalizedType,
        state: stateArr,
        checkIn: normalizeBoolAll(checkInArr),
        checkOut: normalizeBoolAll(checkOutArr),
        getScore: normalizeBoolAll(getScoreArr),
        canScore: normalizeBoolAll(canScoreArr),
      } as any as MyActivityFilters;

      const allEmpty = Object.values(next as any).every(
        (x) => x === undefined || (Array.isArray(x) && x.length === 0),
      );

      setFilters(allEmpty ? undefined : next);
    },
    [setFilters],
  );

  // =====================================================
  // 10) 重置（查询）
  // =====================================================
  const reset = useCallback(() => {
    resetQuery();
  }, [resetQuery]);

  // =====================================================
  // 对外返回
  // =====================================================
  return {
    bizKey: BIZ_KEY,
    presets,
    columns,
    list,
    total,
    loading,
    error,
    reload,

    query,
    setKeyword,
    setPage,
    setSorter,
    setFilters,
    reset,

    onQueryChange,
    onFiltersChange,

    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetColumns,

    exporting,
    exportError,
    exportCsv,

    detailOpen,
    detailLoading,
    detail,
    currentRow,
    openDetail,
    closeDetail,

    detailAction,

    fetchActivityDetail,
  };
}
