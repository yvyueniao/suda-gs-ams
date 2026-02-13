// src/shared/components/table/useTableExport.ts
/**
 * useTableExport
 *
 * 目标：
 * - 前端导出“全量数据（跨所有页）”
 * - 继承当前 query（keyword/filters/sorter 等），但导出时自己控制 page/pageSize
 *
 * 说明：
 * - 你传入的 fetcher 必须是“稳定引用”（useCallback 包一下）
 * - fetcher 返回 ListResult<T>（你 table/types.ts 里定义的那个）
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { ListResult, TableFetcher, TableQuery } from "./types";

export type UseTableExportOptions = {
  /** 导出时每页拉多少条（越大请求越少，但单次响应越大） */
  pageSize?: number;
  /** 最大导出条数保护（防止把浏览器撑爆） */
  maxRows?: number;
  /**
   * 最大页数保护（防止接口异常导致死循环）
   * - 若后端 total 不可信、或一直返回非空 records，可能需要它兜底
   */
  maxPages?: number;
  /**
   * 是否允许在导出时带上 query.page / query.pageSize
   * - 默认 false：导出总是从 page=1 开始，pageSize 由 options.pageSize 控制
   */
  keepPagingFromQuery?: boolean;
};

export type UseTableExportState = {
  exporting: boolean;
  progress: {
    fetched: number;
    total?: number;
    page: number;
  } | null;
  error: unknown | null;
};

export type UseTableExportResult<T extends object> = UseTableExportState & {
  /**
   * 拉取全量数据并返回 rows（不负责格式化/下载）
   * - 你可以拿 rows 去 exportCsv / exportXlsx
   */
  exportAll: () => Promise<T[]>;
  /** 主动取消（如果你愿意在 UI 上提供取消按钮） */
  cancel: () => void;
};

function isNonEmptyArray(x: unknown): x is any[] {
  return Array.isArray(x) && x.length > 0;
}

export function useTableExport<
  T extends object,
  F extends Record<string, any> = Record<string, any>,
>(
  query: TableQuery<F>,
  fetcher: TableFetcher<T, F>,
  options?: UseTableExportOptions,
): UseTableExportResult<T> {
  const {
    pageSize = 500,
    maxRows = 20000,
    maxPages = 200,
    keepPagingFromQuery = false,
  } = options ?? {};

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [progress, setProgress] =
    useState<UseTableExportState["progress"]>(null);

  // 取消标记（不依赖 AbortController，简单可靠）
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const baseQuery = useMemo(() => {
    // 导出时继承 keyword/filters/sorter 等，但默认不继承分页
    const q: TableQuery<F> = { ...(query as any) };

    if (!keepPagingFromQuery) {
      delete (q as any).page;
      delete (q as any).pageSize;
    }
    return q;
  }, [keepPagingFromQuery, query]);

  const exportAll = useCallback(async (): Promise<T[]> => {
    if (exporting) return [];

    cancelRef.current = false;
    setExporting(true);
    setError(null);
    setProgress({ fetched: 0, total: undefined, page: 0 });

    try {
      const rows: T[] = [];

      const startPage =
        keepPagingFromQuery && typeof query.page === "number" && query.page > 0
          ? query.page
          : 1;

      let page = startPage;
      let totalFromServer: number | undefined = undefined;

      while (true) {
        if (cancelRef.current) break;
        if (page > maxPages) {
          throw new Error(`导出页数超过上限（maxPages=${maxPages}），已中止。`);
        }
        if (rows.length >= maxRows) {
          throw new Error(`导出条数超过上限（maxRows=${maxRows}），已中止。`);
        }

        const q: TableQuery<F> = {
          ...(baseQuery as any),
          page,
          pageSize,
        };

        const resp: ListResult<T> = await fetcher(q);

        const list = (resp as any)?.list ?? (resp as any)?.records ?? [];
        const total = (resp as any)?.total;

        if (typeof total === "number" && Number.isFinite(total)) {
          totalFromServer = total;
        }

        if (isNonEmptyArray(list)) {
          rows.push(...(list as T[]));
        }

        setProgress({
          fetched: rows.length,
          total: totalFromServer,
          page,
        });

        // ✅ 终止条件 1：后端给 total，且我们已经拉够
        if (
          typeof totalFromServer === "number" &&
          totalFromServer >= 0 &&
          rows.length >= totalFromServer
        ) {
          break;
        }

        // ✅ 终止条件 2：这一页没有数据（一般表示结束）
        if (!isNonEmptyArray(list)) {
          break;
        }

        // ✅ 终止条件 3：这一页数据少于 pageSize（一般表示最后一页）
        if (Array.isArray(list) && list.length < pageSize) {
          break;
        }

        page += 1;
      }

      // 最终再做一次 maxRows 截断保护（避免刚好 push 超出）
      const finalRows = rows.slice(0, maxRows);
      return finalRows;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setExporting(false);
      // 不清 progress，方便你在 UI 上展示“导出完成/被取消”
    }
  }, [
    baseQuery,
    exporting,
    fetcher,
    keepPagingFromQuery,
    maxPages,
    maxRows,
    pageSize,
    query.page,
  ]);

  return {
    exporting,
    progress,
    error,
    exportAll,
    cancel,
  };
}
