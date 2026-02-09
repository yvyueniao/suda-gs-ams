// src/shared/components/table/useTableData.ts
/**
 * useTableData
 *
 * 职责：
 * - 负责“请求态”的组织：loading / error / data / total
 * - 通过业务侧传入的 fetcher 获取数据：
 *    fetcher(query) -> Promise<ListResult<T>>
 *
 * 关键设计：
 * - 支持两种自动加载模式：
 *   1) "query"  ：query 变化就自动拉取（后端分页/后端筛选）
 *   2) "reload" ：只在首次加载 + 手动 reload 时拉取（全量拉取 + 本地查询）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListResult, TableFetcher, TableQuery } from "./types";

/** useTableData options */
type UseTableDataOptions = {
  /**
   * 是否自动加载
   * - 默认 true
   */
  auto?: boolean;

  /**
   * 自动加载依赖模式：
   * - "query"  ：query 变化触发 load（默认）
   * - "reload" ：仅首次 + reloadTick 触发 load（适合全量拉取 + 本地查询）
   */
  autoDeps?: "query" | "reload";

  /**
   * 初始是否 loading（可选）
   * - 默认 false
   */
  initialLoading?: boolean;
};

type UseTableDataResult<T> = {
  list: T[];
  total: number;

  loading: boolean;
  error: unknown;

  reload: () => void;
};

export function useTableData<
  T,
  F extends Record<string, any> = Record<string, any>,
>(
  query: TableQuery<F>,
  fetcher: TableFetcher<T, F>,
  options?: UseTableDataOptions,
): UseTableDataResult<T> {
  const auto = options?.auto ?? true;
  const autoDeps = options?.autoDeps ?? "query";

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

  // ✅ 首次自动加载：无论 autoDeps 是啥，都只触发一次
  const didInitRef = useRef(false);

  // ✅ 仅在 autoDeps="query" 时，把 query 作为依赖源
  const depsKey = useMemo(() => {
    if (autoDeps === "query") return query;
    // autoDeps === "reload"：不关心 query 变化
    return null;
  }, [autoDeps, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res: ListResult<T> = await fetcher(query);
      setList(res.list ?? []);
      setTotal(typeof res.total === "number" ? res.total : 0);
    } catch (e) {
      setError(e);
      // 保持原数据不清空更友好
    } finally {
      setLoading(false);
    }
  }, [fetcher, query]);

  useEffect(() => {
    if (!auto) return;

    // 首次：只要 auto=true，就会加载一次
    if (!didInitRef.current) {
      didInitRef.current = true;
      void load();
      return;
    }

    // 后续：根据模式决定触发条件
    if (autoDeps === "query") {
      void load();
      return;
    }

    // autoDeps === "reload"：不因 query 变化加载（只等 reloadTick）
    // 这里不做事，交给下面另一个 effect 处理
  }, [auto, autoDeps, depsKey, load]);

  // ✅ reload 模式：只在 reloadTick 变化时触发（并且也要 auto=true）
  useEffect(() => {
    if (!auto) return;
    if (autoDeps !== "reload") return;
    if (!didInitRef.current) return; // 首次已经在上面跑过了

    if (reloadTick > 0) {
      void load();
    }
  }, [auto, autoDeps, reloadTick, load]);

  return { list, total, loading, error, reload };
}
