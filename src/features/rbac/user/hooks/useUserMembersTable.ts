// src/features/rbac/user/hooks/useUserMembersTable.ts

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { message } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import type {
  TableFetcher,
  TableQuery,
  TableSorter,
} from "../../../../shared/components/table";

import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../../shared/components/table";

import { getUserPages } from "../api";
import type { UserListItem } from "../types";

import { USER_COLUMN_PRESETS } from "../table/presets";
import { buildUserColumns } from "../table/columns";
import { getSearchTexts, matchFilters, getSortValue } from "../table/helpers";

/**
 * ✅ 筛选字段（对齐 antd FilterValue 口径）
 * - 你当前要求只做：账号状态 invalid、角色 role
 */
export type UserFilters = {
  role?: FilterValue;
  invalid?: FilterValue;
};

export function useUserMembersTable(params: {
  onUnlock: (record: UserListItem) => void | Promise<unknown>;
  onDetail: (record: UserListItem) => void | Promise<unknown>;
}) {
  const { onUnlock, onDetail } = params;

  // ✅ 用 ref 吸收回调抖动，避免 columns 每次 render 重建
  const onUnlockRef = useRef(onUnlock);
  const onDetailRef = useRef(onDetail);

  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    onDetailRef.current = onDetail;
  }, [onDetail]);

  // ======================================================
  // 0) ✅ 关键修复：强制刷新版本号（不动 shared，也能保证每次都重新请求）
  // - 点击刷新 / 操作后刷新：bumpRefresh()
  // - queryWithRefresh 变化 => useTableData 一定重新 fetch
  // ======================================================
  const [refreshSeq, bumpRefresh] = useReducer((x: number) => x + 1, 0);

  // ======================================================
  // 1) query：唯一真相源（后端分页）
  // ======================================================
  const q = useTableQuery<UserFilters>({});

  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  // ======================================================
  // 2) fetcher：只把 page/pageSize/keyword 传给后端
  // - 后端字段：pageNum/pageSize/key
  // - 后端只分页，不负责筛选/排序
  //
  // ✅ 关键修复：对同参数的并发/重复调用做“请求去重”
  // - 解决：进入页面/输入触发导致的短时间重复请求（含 StrictMode 开发期的双触发）
  // - 同一个 key（page/pageSize/keyword）在飞行中时复用同一个 Promise
  // ======================================================
  const inFlightRef = useRef<
    Map<string, Promise<{ list: UserListItem[]; total: number }>>
  >(new Map());

  const fetchPage: TableFetcher<UserListItem, UserFilters> = useCallback(
    async (qq) => {
      const key = JSON.stringify({
        page: qq.page,
        pageSize: qq.pageSize,
        keyword: qq.keyword?.trim() ? qq.keyword.trim() : "",
      });

      const cached = inFlightRef.current.get(key);
      if (cached) return cached;

      const task = (async () => {
        const { list, total } = await getUserPages({
          pageNum: qq.page,
          pageSize: qq.pageSize,
          key: qq.keyword?.trim() ? qq.keyword.trim() : undefined,
        });
        return { list, total };
      })();

      inFlightRef.current.set(key, task);

      try {
        return await task;
      } finally {
        // ✅ 不论成功失败，都释放 inFlight（避免 Map 越积越多）
        inFlightRef.current.delete(key);
      }
    },
    [],
  );

  // ✅ 把 refreshSeq 注入 query（只用于触发刷新，不参与接口参数）
  const queryWithRefresh = useMemo(() => {
    return { ...query, __refreshSeq: refreshSeq } as typeof query & {
      __refreshSeq: number;
    };
  }, [query, refreshSeq]);

  // ✅ 后端分页：query 变更自动请求（现在 refresh 也会触发）
  const tableDataOptions = useMemo(() => ({ autoDeps: "query" as const }), []);
  const d = useTableData(queryWithRefresh as any, fetchPage, tableDataOptions);

  // ======================================================
  // 3) 本地查询：仅对“当前页数据”做 keyword/filters/sorter
  // ⚠️ 注意：后端分页下，不能再二次分页
  // ======================================================
  const local = useMemo(() => {
    const noPagingQuery = {
      ...query,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    };

    return applyLocalQuery<UserListItem, UserFilters>(d.list, noPagingQuery, {
      getSearchTexts,
      matchFilters,
      getSortValue,
    });
  }, [d.list, query]);

  // ======================================================
  // 4) 列偏好
  // ======================================================
  const prefs = useColumnPrefs<UserListItem>(
    "rbac.user.members",
    USER_COLUMN_PRESETS,
  );

  // ======================================================
  // 5) columns：只依赖 prefs（回调通过 ref 调用）
  // ======================================================
  const columns = useMemo(() => {
    const raw = buildUserColumns({
      onUnlock: (record) => onUnlockRef.current(record),
      onDetail: (record) => onDetailRef.current(record),
    });

    return prefs.applyPresetsToAntdColumns(raw);
  }, [prefs]);

  // ======================================================
  // 6) 导出：当前页（过滤/排序后的）结果导出
  // ======================================================
  const exportOptions = useMemo(
    () => ({
      filenameBase: "用户管理-当前页",
      notify: (type: "success" | "error" | "info", text: string) => {
        if (type === "success") message.success(text);
        else if (type === "error") message.error(text);
        else message.info(text);
      },
    }),
    [],
  );

  const exp = useLocalExport(
    local.filtered,
    USER_COLUMN_PRESETS,
    prefs.visibleKeys,
    exportOptions,
  );

  // ======================================================
  // 7) onQueryChange：受控回写
  // ======================================================
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<UserFilters>>) => {
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }

      if ("filters" in next) {
        setFilters(next.filters);
      }

      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  // ======================================================
  // ✅ 关键：业务层覆盖 reload
  // - 以前：d.reload() 可能因为内部去重/依赖不变而“不请求”
  // - 现在：bumpRefresh() 一定让 queryWithRefresh 变 => 一定重新请求
  // ======================================================
  const reload = useCallback(() => {
    bumpRefresh();
  }, []);

  return {
    table: {
      // 当前页经过本地筛选/排序后的 rows
      rows: local.list,

      // total 使用后端 total
      total: d.total,

      // 当前页过滤后的集合（导出用）
      filtered: local.filtered,

      loading: d.loading,
      error: d.error,

      // ✅ 修复后的刷新（真正生效）
      reload,

      query,
      onQueryChange,

      setKeyword,

      // reset 之后也建议刷新一下（避免 reset 后仍旧是旧请求缓存）
      reset: () => {
        reset();
        bumpRefresh();
      },

      exportCsv: exp.exportCsv,
      exporting: exp.exporting,
    },

    columns,
    columnPrefs: prefs,
    presets: USER_COLUMN_PRESETS,
  };
}
