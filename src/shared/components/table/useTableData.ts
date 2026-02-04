// src/shared/components/table/useTableData.ts
/**
 * useTableData
 *
 * 职责：
 * - 负责“请求态”的组织：loading / error / data / total
 * - 不关心后端字段名（records/pageNum/code/... 都不应出现在这里）
 * - 通过业务侧传入的 fetcher 获取数据：
 *    fetcher(query) -> Promise<ListResult<T>>
 *
 * 说明：
 * - 目前阶段：你要“先搭骨架”，所以这里实现保持最小可用
 * - 等后端接口确定后：
 *   - 你只需要在业务的 api.ts 里实现 fetcher（或通过 shared/http/listAdapter.ts 做映射）
 *   - useTableData 不需要改（最多加防抖/取消请求）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListResult, TableFetcher, TableQuery } from "./types";

/** useTableData options */
type UseTableDataOptions = {
  /**
   * 是否自动在 query 变化时加载数据
   * - 默认 true
   */
  auto?: boolean;

  /**
   * 初始是否 loading（可选）
   * - 默认 false
   */
  initialLoading?: boolean;
};

type UseTableDataResult<T> = {
  /** 列表数据 */
  list: T[];
  /** 总条数（用于分页） */
  total: number;

  /** 加载态 */
  loading: boolean;

  /** 错误对象（不强制 ApiError，保持通用） */
  error: unknown;

  /** 手动触发重新加载 */
  reload: () => void;
};

/**
 * useTableData
 *
 * @param query - 来自 useTableQuery 的 query
 * @param fetcher - 业务侧提供的数据获取函数（不直接耦合 axios/http client）
 * @param options - 行为开关
 */
export function useTableData<
  T,
  F extends Record<string, any> = Record<string, any>,
>(
  query: TableQuery<F>,
  fetcher: TableFetcher<T, F>,
  options?: UseTableDataOptions,
): UseTableDataResult<T> {
  const auto = options?.auto ?? true;
  const [loading, setLoading] = useState<boolean>(
    options?.initialLoading ?? false,
  );
  const [error, setError] = useState<unknown>(null);
  const [list, setList] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);

  // 用于触发 reload（不改变 query 的情况下重新拉取）
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => {
    setReloadTick((x) => x + 1);
  }, []);

  const stableQuery = useMemo(() => query, [query]); // 语义占位：后续可做更细粒度 memo

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res: ListResult<T> = await fetcher(stableQuery);
      setList(res.list ?? []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e);
      // 保持原数据不清空更友好（也可根据需求清空）
    } finally {
      setLoading(false);
    }
  }, [fetcher, stableQuery]);

  useEffect(() => {
    if (!auto) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, load, reloadTick]);

  return { list, total, loading, error, reload };
}
