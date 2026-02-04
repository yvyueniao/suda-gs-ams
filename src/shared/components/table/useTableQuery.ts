// src/shared/components/table/useTableQuery.ts
/**
 * useTableQuery
 *
 * 职责：
 * - 维护“前端内部统一”的表格查询状态（query）
 * - 不负责发请求、不感知后端协议
 * - 提供一组稳定的更新方法，供 SmartTable / TableToolbar / 页面调用
 *
 * 设计原则：
 * - 单一职责：只管 query 状态
 * - 不引入任何业务字段名
 * - 不依赖 features/*，只依赖 table/types 与 table/constants
 */

import { useCallback, useState } from "react";
import type { TableQuery, TableSorter } from "./types";
import { TABLE_DEFAULT_PAGE_SIZE, TABLE_DEFAULT_QUERY } from "./constants";

/**
 * useTableQuery Options
 * - initial: 初始查询状态（可选）
 */
type UseTableQueryOptions<F extends Record<string, any>> = {
  initial?: Partial<TableQuery<F>>;
};

type UseTableQueryResult<F extends Record<string, any>> = {
  /** 当前查询状态 */
  query: TableQuery<F>;

  /** 设置分页 */
  setPage: (page: number, pageSize?: number) => void;

  /** 设置排序 */
  setSorter: (sorter?: TableSorter) => void;

  /** 设置过滤条件 */
  setFilters: (filters?: Partial<F>) => void;

  /** 设置搜索关键字 */
  setKeyword: (keyword?: string) => void;

  /** 重置为初始状态 */
  reset: () => void;
};

/**
 * useTableQuery
 *
 * @example
 * const { query, setPage, setSorter, setFilters, setKeyword, reset } =
 *   useTableQuery<ActivityFilters>();
 */
export function useTableQuery<
  F extends Record<string, any> = Record<string, any>,
>(options?: UseTableQueryOptions<F>): UseTableQueryResult<F> {
  const initialQuery: TableQuery<F> = {
    page: TABLE_DEFAULT_QUERY.page,
    pageSize: TABLE_DEFAULT_PAGE_SIZE,
    ...(options?.initial ?? {}),
  };

  const [query, setQuery] = useState<TableQuery<F>>(initialQuery);

  /** 设置分页（通常由 Table 的 pagination 触发） */
  const setPage = useCallback((page: number, pageSize?: number) => {
    setQuery((prev) => ({
      ...prev,
      page,
      pageSize: pageSize ?? prev.pageSize,
    }));
  }, []);

  /** 设置排序（通常由 Table 的 onChange 触发） */
  const setSorter = useCallback((sorter?: TableSorter) => {
    setQuery((prev) => ({
      ...prev,
      sorter,
      page: 1, // 排序变化通常回到第一页
    }));
  }, []);

  /** 设置过滤条件（通常由筛选条触发） */
  const setFilters = useCallback((filters?: Partial<F>) => {
    setQuery((prev) => ({
      ...prev,
      filters,
      page: 1, // 过滤变化回到第一页
    }));
  }, []);

  /** 设置搜索关键字（通常由搜索框触发） */
  const setKeyword = useCallback((keyword?: string) => {
    setQuery((prev) => ({
      ...prev,
      keyword,
      page: 1, // 搜索变化回到第一页
    }));
  }, []);

  /** 重置查询状态 */
  const reset = useCallback(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return {
    query,
    setPage,
    setSorter,
    setFilters,
    setKeyword,
    reset,
  };
}
