// src/features/feedback/hooks/useFeedbackListPage.ts
//
// useFeedbackListPage（Pure）
//
// 职责：
// - 复用同一套“反馈列表页编排”：普通用户（mine）/管理员（all）
// - 数据源：真全量拉取（mine: /session/myFeedbacks，all: /session/allFeedback）
// - 前端本地实现：分页 / 搜索 / 筛选 / 排序 / 导出 / 列配置 / 列宽拖拽
//
// 约定：
// - ✅ 业务层不做 UI：不 message / 不 Modal
// - ✅ SmartTable 的 query 回写通过 onQueryChange（Partial<TableQuery>）
// - ✅ mine：keyword 只搜 title
// - ✅ all ：keyword 搜 title + name（兜底 username）
// - ✅ filters：只做 state
// - ✅ sorter：time（可选 state）

import { useCallback, useMemo } from "react";
import type { FilterValue } from "antd/es/table/interface";

import type { TableQuery, TableSorter } from "../../../shared/components/table";
import {
  useTableQuery,
  useTableData,
  applyLocalQuery,
  useLocalExport,
  useColumnPrefs,
} from "../../../shared/components/table";

import type { FeedbackListMode, FeedbackSessionItem } from "../types";
import { fetchAllFeedbacks, fetchMyFeedbacks } from "../api";

import { buildFeedbackColumns } from "../table/columns";
import {
  feedbackAllTablePresets,
  feedbackMineTablePresets,
} from "../table/presets";
import { getSearchTexts, matchFilters, getSortValue } from "../table/helpers";

export type UseFeedbackListPageOptions = {
  mode: FeedbackListMode;
  onDetail: (record: FeedbackSessionItem) => void | Promise<unknown>;
};

export function useFeedbackListPage(options: UseFeedbackListPageOptions) {
  const { mode, onDetail } = options;

  const presets = useMemo(() => {
    return mode === "mine" ? feedbackMineTablePresets : feedbackAllTablePresets;
  }, [mode]);

  /**
   * 1️⃣ 查询状态（keyword / page / sorter / filters）
   */
  const q = useTableQuery<Record<string, FilterValue | null>>();
  const { query, setPage, setSorter, setFilters, setKeyword, reset } = q;

  /**
   * 2️⃣ 拉取后端全量数据（全量模式：仅首次 + reload 时拉）
   * ✅ autoDeps="reload"：避免 query 变化导致反复请求
   */
  const d = useTableData<FeedbackSessionItem, Record<string, any>>(
    query,
    async () => {
      const list =
        mode === "mine" ? await fetchMyFeedbacks() : await fetchAllFeedbacks();
      return { list, total: list.length };
    },
    { autoDeps: "reload" },
  );

  /**
   * 3️⃣ 本地过滤 / 排序 / 分页
   * applyLocalQuery 返回：filtered/total/list（与其它模块一致）
   *
   * ⚠️ 注意：你们表格引擎的 getSortValue 签名是 (row, sorter: TableSorter) => unknown
   * 但我们 helpers 里实现的是 (row, sortKey: string) => string | number
   * 所以这里做一层适配：sorter.key -> sortKey
   */
  const localOptions = useMemo(() => {
    return {
      getSearchTexts: (row: FeedbackSessionItem) => getSearchTexts(row, mode),
      matchFilters,
      getSortValue: (row: FeedbackSessionItem, sorter: TableSorter) => {
        const key = String((sorter as any)?.key ?? "");
        return getSortValue(row, key);
      },
    };
  }, [mode]);

  const local = useMemo(() => {
    return applyLocalQuery<FeedbackSessionItem, Record<string, any>>(
      d.list ?? [],
      query,
      localOptions,
    );
  }, [d.list, query, localOptions]);

  /**
   * 4️⃣ 列偏好（显隐 / 顺序 / 宽度）
   * bizKey：feedback.mine / feedback.all（与页面 SmartTable.bizKey 保持一致）
   */
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<FeedbackSessionItem>(
    mode === "mine" ? "feedback.mine" : "feedback.all",
    presets,
  );

  /**
   * 5️⃣ columns（操作列：详情）
   * ✅ 只产出 antd Columns；列显示/顺序/宽度由 applyPresetsToAntdColumns 叠加
   */
  const baseColumns = useMemo(() => {
    return buildFeedbackColumns({ onDetail });
  }, [onDetail]);

  /**
   * 6️⃣ CSV 导出（基于 filtered：过滤+排序后的全量结果，不受分页影响）
   */
  const exp = useLocalExport<FeedbackSessionItem>(
    local.filtered,
    presets,
    visibleKeys,
    { filenameBase: mode === "mine" ? "我的反馈" : "全部反馈" },
  );

  /**
   * 7️⃣ SmartTable 桥接：SmartTable 只回传分页/排序/筛选/keyword（Partial<TableQuery>）
   */
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<Record<string, any>>>) => {
      // 分页
      if (typeof next.page === "number") {
        setPage(next.page, next.pageSize);
      } else if (typeof next.pageSize === "number") {
        setPage(query.page, next.pageSize);
      }

      // 排序
      if ("sorter" in next) {
        setSorter(next.sorter);
      }

      // 筛选
      if ("filters" in next) {
        setFilters(next.filters);
      }

      // 关键词
      if ("keyword" in next) {
        setKeyword(next.keyword);
      }
    },
    [setPage, setSorter, setFilters, setKeyword, query.page],
  );

  return {
    mode,

    // table data
    rows: local.list, // 当前页
    total: local.total,

    // raw request state
    loading: d.loading,
    error: d.error,
    reload: d.reload,

    // query state
    query,
    setKeyword,
    setFilters,
    reset,
    onQueryChange,

    // columns + presets bridge
    presets,
    baseColumns,
    applyPresetsToAntdColumns,

    // column settings
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,

    // export
    exporting: exp.exporting,
    exportCsv: exp.exportCsv,
  };
}
