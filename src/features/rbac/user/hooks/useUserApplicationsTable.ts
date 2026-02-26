// src/features/rbac/user/hooks/useUserApplicationsTable.ts

/**
 * useUserApplicationsTable
 *
 * ✅ 文件定位（features 层业务编排 Hook）
 * - 用户详情弹窗/抽屉下半部分：「该用户的活动列表」表格编排
 * - 数据来源：POST /activity/usernameApplications（按 username 查询其相关活动）
 *
 * ✅ 能力要求（SmartTable 全家桶）：
 * - 前端分页 / 搜索 / 排序 / 筛选（本地 applyLocalQuery）
 * - 导出 / 列设置 / 拖拽列宽（SmartTable + useColumnPrefs + useLocalExport）
 *
 * ✅ 约定
 * - 本 hook 不做 UI toast（导出提示这里用 antd message；如需统一，可改为 Notify 注入）
 * - 不吞错误：useTableData 暴露 error 给页面层 SmartTable
 *
 * ✅ 注意：你当前项目实际文件/导出是 apps.*（见你截图与报错）
 * - apps.presets.ts 导出：USER_APPS_COLUMN_PRESETS
 * - apps.columns.tsx 导出：buildUserAppsColumns
 * - apps.helpers.ts 导出：getSearchTexts / matchFilters / getSortValue
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { message } from "antd";

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

import { getUsernameApplications } from "../api";
import type { UsernameApplicationItem } from "../types";

import { USER_APPS_COLUMN_PRESETS } from "../table/apps.presets";
import { buildUserAppsColumns } from "../table/apps.columns";
import {
  getSearchTexts,
  matchFilters,
  getSortValue,
} from "../table/apps.helpers";

/**
 * ✅ filters：按需扩展（比如 state/type/checkIn/getScore 等）
 * 这里用 Record<string, any> 先兼容你后续扩展
 */
export type UserApplicationsFilters = Record<string, any>;

export function useUserApplicationsTable(params: {
  /** 当前查看的用户学号（username） */
  username: string | null | undefined;
}) {
  const username = String(params.username ?? "").trim();

  // ======================================================
  // 0) 强制刷新版本号（保证 reload 一定重新拉取）
  // ======================================================
  const [refreshSeq, bumpRefresh] = useReducer((x: number) => x + 1, 0);

  // ======================================================
  // 1) query：唯一真相源（前端分页）
  // ======================================================
  const q = useTableQuery<UserApplicationsFilters>({
    initial: { page: 1, pageSize: 10 },
  });

  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  // 当 username 变化：自动 reset + refresh（避免切用户后仍停留在旧筛选/旧页码）
  const prevUsernameRef = useRef<string>("");
  useEffect(() => {
    if (prevUsernameRef.current === username) return;
    prevUsernameRef.current = username;

    reset();
    bumpRefresh();
  }, [reset, username]);

  // ======================================================
  // 2) fetcher：按 username 拉全量（接口一般不分页）
  // - ✅ 并发去重：同 username 在飞行中复用同一个 Promise
  // ======================================================
  const inFlightRef = useRef<Map<string, Promise<UsernameApplicationItem[]>>>(
    new Map(),
  );

  const fetchAll: TableFetcher<
    UsernameApplicationItem,
    UserApplicationsFilters
  > = useCallback(async () => {
    if (!username) return { list: [], total: 0 };

    const key = username;
    const cached = inFlightRef.current.get(key);
    if (cached) {
      const list = await cached;
      const safe = Array.isArray(list) ? list : [];
      return { list: safe, total: safe.length };
    }

    const task = (async () => {
      const list = await getUsernameApplications(username);
      return Array.isArray(list) ? list : [];
    })();

    inFlightRef.current.set(key, task);

    try {
      const list = await task;
      return { list, total: list.length };
    } finally {
      inFlightRef.current.delete(key);
    }
  }, [username]);

  // ✅ 把 refreshSeq 注入 query：用于触发 useTableData 重新请求
  const queryWithRefresh = useMemo(() => {
    return { ...query, __refreshSeq: refreshSeq } as typeof query & {
      __refreshSeq: number;
    };
  }, [query, refreshSeq]);

  /**
   * ✅ 这里用 autoDeps="query"：
   * - fetchAll 内部只依赖 username（忽略 page/pageSize/keyword/filters/sorter）
   * - query 变化会触发 reload，但请求参数不变
   *
   * 若你希望“本地分页/筛选/搜索不触发请求”，需要 shared/useTableData 支持 manual 模式；
   * 当前先保持与你 user.members 一致的写法（稳定、可用）。
   */
  const tableDataOptions = useMemo(() => ({ autoDeps: "query" as const }), []);
  const d = useTableData(queryWithRefresh as any, fetchAll, tableDataOptions);

  // ======================================================
  // 3) 本地查询：对全量列表做搜索/筛选/排序/分页
  // ======================================================
  const local = useMemo(() => {
    return applyLocalQuery<UsernameApplicationItem, UserApplicationsFilters>(
      d.list,
      query,
      {
        getSearchTexts,
        matchFilters,
        getSortValue,
      },
    );
  }, [d.list, query]);

  // ======================================================
  // 4) 列偏好
  // ======================================================
  const prefs = useColumnPrefs<UsernameApplicationItem>(
    "rbac.user.applications",
    USER_APPS_COLUMN_PRESETS,
  );

  // ======================================================
  // 5) columns：只依赖 prefs
  // ======================================================
  const columns = useMemo(() => {
    // ✅ 关键：buildUserAppsColumns 返回 ColumnsType<UserApplicationRow>
    // 但我们在 apps.columns.tsx 里应该使用 UsernameApplicationItem 作为行类型
    // 这里做一次类型对齐（见你上一条 TS 报错的根因）
    const raw = buildUserAppsColumns() as any;
    return prefs.applyPresetsToAntdColumns(raw);
  }, [prefs]);

  // ======================================================
  // 6) 导出：导出“过滤/排序后的全集”（不受分页影响）
  // - 如你希望只导出当前页，把 local.filtered 换成 local.list
  // ======================================================
  const exportOptions = useMemo(
    () => ({
      filenameBase: `用户活动列表-${username || "未知用户"}`,
      notify: (type: "success" | "error" | "info", text: string) => {
        if (type === "success") message.success(text);
        else if (type === "error") message.error(text);
        else message.info(text);
      },
    }),
    [username],
  );

  const exp = useLocalExport(
    local.filtered,
    USER_APPS_COLUMN_PRESETS,
    prefs.visibleKeys,
    exportOptions,
  );

  // ======================================================
  // 7) onQueryChange：受控回写
  // ======================================================
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<UserApplicationsFilters>>) => {
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
    [query.page, setFilters, setKeyword, setPage, setSorter],
  );

  // ======================================================
  // 8) reload：强制刷新
  // ======================================================
  const reload = useCallback(() => {
    bumpRefresh();
  }, []);

  return {
    table: {
      // 当前页 rows（已分页）
      rows: local.list,

      // total：用“过滤后的全集”长度（分页 total 口径更正确）
      total: local.total,

      // 过滤/排序后的全集（导出用）
      filtered: local.filtered,

      loading: d.loading,
      error: d.error,

      reload,

      query,
      onQueryChange,

      setKeyword,

      reset: () => {
        reset();
        bumpRefresh();
      },

      exportCsv: exp.exportCsv,
      exporting: exp.exporting,
    },

    columns,
    columnPrefs: prefs,
    presets: USER_APPS_COLUMN_PRESETS,
  };
}
