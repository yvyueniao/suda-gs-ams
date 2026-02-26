// src/features/system/hooks/useSystemLogsTable.ts

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  useTableQuery,
  useTableData,
  applyLocalQuery,
  useLocalExport,
  useColumnPrefs,
} from "../../../shared/components/table";

import type { TableQuery } from "../../../shared/components/table";

import { fetchSystemLogs } from "../api";
import type { SystemLogItem } from "../types";
import { systemLogColumnPresets } from "../table/presets";
import { buildSystemLogLocalQueryOptions } from "../table/helpers";

type SortOrder = "ascend" | "descend" | null | undefined;
type TableSorter = { field?: string; order?: SortOrder } | null | undefined;

function sameSorter(a: TableSorter, b: TableSorter) {
  const af = a?.field ?? "";
  const ao = a?.order ?? null;
  const bf = b?.field ?? "";
  const bo = b?.order ?? null;
  return af === bf && ao === bo;
}

function normalizePage(v: unknown, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function normalizePageSize(v: unknown, fallback = 10) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export function useSystemLogsTable() {
  /**
   * 1️⃣ 查询状态（page/pageSize/keyword/sorter）
   */
  const q = useTableQuery<Record<string, any>>();
  const { query, setPage, setSorter, setKeyword, reset } = q;

  // ✅ 统一分页值（永远给出稳定数字）
  const page = normalizePage(query.page, 1);
  const pageSize = normalizePageSize(query.pageSize, 10);

  /**
   * ✅ 默认排序：time 倒序（只注入一次）
   * 只影响前端“当前页排序”，不触发后端请求
   */
  const defaultSorterRanRef = useRef(false);
  useEffect(() => {
    if (defaultSorterRanRef.current) return;
    defaultSorterRanRef.current = true;
    if (!query.sorter) {
      setSorter({ field: "time", order: "descend" });
    }
  }, [query.sorter, setSorter]);

  /**
   * 2️⃣ 后端分页：只在 “首次 + reload()” 时请求
   * ✅ autoDeps="reload"：彻底切断“query引用变化”导致的请求风暴
   */
  const d = useTableData<SystemLogItem, { page: number; pageSize: number }>(
    { page, pageSize },
    async () => {
      const { list, total } = await fetchSystemLogs({
        pageNum: page,
        pageSize,
      });
      return { list, total };
    },
    { autoDeps: "reload" },
  );

  /**
   * ✅ page/pageSize 变化时，手动触发 reload（一次）
   */
  const lastPagingRef = useRef<{ page: number; pageSize: number } | null>(null);
  useEffect(() => {
    const last = lastPagingRef.current;
    if (!last) {
      lastPagingRef.current = { page, pageSize };
      return;
    }
    if (last.page !== page || last.pageSize !== pageSize) {
      lastPagingRef.current = { page, pageSize };
      d.reload();
    }
  }, [page, pageSize, d]);

  /**
   * ✅ 显式刷新（按钮点一下就 reload）
   */
  const reload = useCallback(() => d.reload(), [d]);

  /**
   * 3️⃣ 本地 keyword 搜索 + 本地排序（仅当前页）
   * 🚫 关键：不要二次分页（否则第 2 页会被 slice 成空）
   */
  const localOptions = useMemo(() => buildSystemLogLocalQueryOptions(), []);

  // ✅ 本地用的 query：强制 page=1，避免 applyLocalQuery 再切一次分页
  const localQuery = useMemo(() => {
    return {
      ...query,
      page: 1,
      pageSize: 999999, // 足够大即可
    };
  }, [query]);

  const local = useMemo(() => {
    return applyLocalQuery<SystemLogItem, Record<string, any>>(
      d.list ?? [], // ✅ 当前页数据
      localQuery, // ✅ 禁用二次分页
      localOptions,
    );
  }, [d.list, localQuery, localOptions]);

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
  } = useColumnPrefs<SystemLogItem>("system.logs", systemLogColumnPresets);

  /**
   * 5️⃣ CSV 导出（基于当前页 filtered）
   */
  const exp = useLocalExport<SystemLogItem>(
    local.filtered,
    systemLogColumnPresets,
    visibleKeys,
    { filenameBase: "系统日志" },
  );

  /**
   * 6️⃣ SmartTable 桥接（值相等不更新）
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      // pagination（✅ 触发后端翻页）
      const nextPage = normalizePage(
        typeof next.page === "number" ? next.page : page,
        page,
      );
      const nextPageSize = normalizePageSize(
        typeof next.pageSize === "number" ? next.pageSize : pageSize,
        pageSize,
      );
      if (nextPage !== page || nextPageSize !== pageSize) {
        setPage(nextPage, nextPageSize);
      }

      // sorter（只前端，对当前页生效）
      if ("sorter" in next) {
        if (!sameSorter(query.sorter as any, next.sorter as any)) {
          setSorter(next.sorter);
        }
      }

      // keyword（只前端；变更回第一页，同时触发一次后端请求 page=1）
      if ("keyword" in next) {
        const nk = String(next.keyword ?? "");
        const ck = String(query.keyword ?? "");
        if (nk !== ck) {
          setKeyword(next.keyword);
          if (page !== 1) {
            setPage(1, pageSize);
          }
        }
      }
    },
    [
      page,
      pageSize,
      query.sorter,
      query.keyword,
      setPage,
      setSorter,
      setKeyword,
    ],
  );

  return {
    // ✅ rows：用 local.filtered（当前页做完搜索/排序后的结果）
    rows: local.filtered,
    // ✅ total：用后端 total（分页器页数才正确）
    total: d.total ?? 0,

    loading: d.loading,
    error: d.error,

    reload,

    query,
    setKeyword,
    reset,
    onQueryChange,

    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,

    exporting: exp.exporting,
    exportCsv: exp.exportCsv,
  };
}
