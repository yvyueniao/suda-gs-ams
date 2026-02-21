// src/features/activity-apply/hooks/useEnrollTable.ts

/**
 * useEnrollTable
 *
 * 文件定位：
 * - features/activity-apply/hooks 层
 * - “报名列表页”的表格编排 Hook（不做 UI）
 *
 * 职责：
 * 1) 拉取：全部活动列表 + 我的报名记录
 * 2) 合并：生成 EnrollTableRow（包含 applyState / myApplication）
 * 3) 接入通用表格能力：
 *    - query（分页/排序/筛选/搜索）
 *    - data（加载/错误/刷新）
 *    - localQuery（本地搜索/筛选/排序/分页）
 *    - columnPrefs（列偏好持久化）
 *    - export（本地 CSV 导出）
 * 4) 组装 columns：
 *    - 操作列：报名/取消/详情
 *    - ✅ 报名优先走页面层注入的 flow（弹窗结果）
 *    - ✅ 取消优先走页面层注入的 flow（最终 toast 成功/失败）
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message、不 Modal）
 * - ✅ 行为统一：优先使用外部注入 actions/flow，避免“两个 loading 状态源”
 */

import { useCallback, useMemo } from "react";
import type {
  ListResult,
  TableFetcher,
  TableQuery,
} from "../../../shared/components/table";
import {
  applyLocalQuery,
  useColumnPrefs,
  useLocalExport,
  useTableData,
  useTableQuery,
} from "../../../shared/components/table";

import type { FilterValue } from "antd/es/table/interface";

import { getMyApplications, searchAllActivities } from "../api";
import type { EnrollTableRow } from "../types";
import { buildEnrollColumns } from "../table/columns";
import { activityApplyTablePresets } from "../table/presets";
import {
  type EnrollTableFilters,
  mergeEnrollRows,
  getSearchTexts,
  matchFilters,
  getSortValue,
} from "../table/helpers";
import { useApplyActions } from "./useApplyActions";
import { useApplyFlow } from "./useApplyFlow";

/**
 * normalizeAntdFilters
 *
 * antd Table 的 filters 回传：
 * - null：未设置
 * - []：清空
 * - [value] / [v1,v2]：单选/多选
 *
 * 我们这里的约定：
 * - filters 直接存进 TableQuery.filters（保持数组形态，兼容多选）
 * - 遇到 null/空数组 => 不写入
 */
function normalizeAntdFilters<F extends Record<string, any>>(
  filters: Record<string, FilterValue | null>,
): Partial<F> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(filters ?? {})) {
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<F>;
}

export function useEnrollTable(options?: {
  /** 点击“详情”时抛出 id（页面层决定：跳转详情页 / 打开弹窗） */
  onOpenDetail?: (id: number) => void;

  /** ✅ 报名按钮点击：页面层接入 useApplyFlow 后传 startRegister 进来 */
  onRegister?: (row: EnrollTableRow) => void | Promise<unknown>;

  /** ✅ 取消按钮点击：建议页面层接入 useApplyFlow.startCancelWithNotify */
  onCancel?: (row: EnrollTableRow) => void | Promise<unknown>;

  /**
   * ✅ 允许外部注入 applyActions
   * 用途：
   * - 保证列表页（useEnrollTable）与页面层（useEnrollPage/useApplyFlow）共用同一套 actions
   * - 这样 loading/错误口径/刷新回调都不会分裂
   */
  applyActions?: ReturnType<typeof useApplyActions>;

  /**
   * ✅ 可选：也允许外部注入 applyFlow
   * 用途：
   * - 当列表页不显式传 onCancel 时，依旧可以通过 flow 来实现“取消成功/失败 toast”
   */
  applyFlow?: ReturnType<typeof useApplyFlow>;

  /**
   * ✅ 新增：由外部传入 nowMs
   * 用途：
   * - 让列表页“报名时间窗禁用”有一个明确的时间口径
   * - 避免 columns.tsx 自己 Date.now() 导致不刷新/不可控
   */
  nowMs?: number;
}) {
  const bizKey = "activityApply.list";

  // =========================
  // 1) 查询状态（受控表格）
  // =========================
  const {
    query,
    setKeyword,
    setFilters,
    setPage,
    setSorter,
    reset: resetQuery,
  } = useTableQuery<EnrollTableFilters>({
    initial: {
      page: 1,
      pageSize: 10,
      keyword: undefined,
      filters: {},
      sorter: undefined,
    },
  });

  // =========================
  // 2) 数据拉取（一次拉全量：列表页走本地分页/排序/筛选）
  // =========================
  const fetcher: TableFetcher<EnrollTableRow, EnrollTableFilters> = useCallback(
    async (
      _q: TableQuery<EnrollTableFilters>,
    ): Promise<ListResult<EnrollTableRow>> => {
      const [activities, myApps] = await Promise.all([
        searchAllActivities(),
        getMyApplications(),
      ]);

      const list = mergeEnrollRows(activities ?? [], myApps ?? []);
      return { list, total: list.length };
    },
    [],
  );

  const tableData = useTableData<EnrollTableRow, EnrollTableFilters>(
    query,
    fetcher,
    { autoDeps: "reload" },
  );

  // =========================
  // 3) 本地过滤/排序/搜索/分页（applyLocalQuery）
  // =========================
  const local = useMemo(() => {
    return applyLocalQuery<EnrollTableRow, EnrollTableFilters>(
      tableData.list ?? [],
      query,
      { getSearchTexts, matchFilters, getSortValue },
    );
  }, [tableData.list, query]);

  // =========================
  // 4) 列偏好（显隐/顺序/宽度）
  // =========================
  const columnPrefs = useColumnPrefs<EnrollTableRow>(
    bizKey,
    activityApplyTablePresets,
    { version: 3 },
  );

  // =========================
  // 5) 行动作：报名/候补/取消
  // - ✅ 优先使用外部注入（避免状态分裂）
  // - ✅ fallback：内部创建（用于简单页面/单测）
  // =========================
  const innerActions = useApplyActions({
    onChanged: async () => {
      await tableData.reload();
    },
    muteActionErrorToast: true,
  });
  const applyActions = options?.applyActions ?? innerActions;

  // =========================
  // 6) columns 组装（含 操作列：报名/取消/详情）
  // =========================
  const columns = useMemo(() => {
    const base = buildEnrollColumns({
      // ✅ 新增：nowMs 统一注入（给“报名窗外禁用”/“取消窗外禁用”共用）
      nowMs: options?.nowMs ?? Date.now(),

      onDetail: (row) => options?.onOpenDetail?.(row.id),

      // ✅ 报名：优先走页面层注入（通常是 flow.startRegister → 弹窗结果）
      onRegister: async (row) => {
        if (options?.onRegister) return options.onRegister(row);
        return applyActions.register(row.id);
      },

      // ✅ 取消：优先走页面层注入（通常是 flow.startCancelWithNotify → toast）
      // fallback：
      // 1) 如果注入了 applyFlow，则用 flow.startCancelWithNotify（带 toast）
      // 2) 否则直接 actions.cancel（不 toast）
      onCancel: async (row) => {
        if (options?.onCancel) return options.onCancel(row);
        if (options?.applyFlow) {
          return options.applyFlow.startCancelWithNotify(row.id);
        }
        return applyActions.cancel(row.id);
      },

      // loading：同一个 rowAction 池，避免重复 loading
      isRegistering: (id) => applyActions.rowAction.isLoading(id),
      isCanceling: (id) => applyActions.rowAction.isLoading(id),
    });

    return columnPrefs.applyPresetsToAntdColumns(base);
  }, [
    options?.nowMs,
    options?.onOpenDetail,
    options?.onRegister,
    options?.onCancel,
    options?.applyFlow,
    applyActions,
    columnPrefs,
  ]);

  // =========================
  // 7) 导出：基于“过滤后的全量列表”
  // =========================
  const exporter = useLocalExport<EnrollTableRow>(
    local.filtered,
    activityApplyTablePresets,
    columnPrefs.visibleKeys,
    { filenameBase: "活动讲座报名列表" },
  );

  // =========================
  // 8) 受控回写（SmartTable 触发）
  // =========================
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<EnrollTableFilters>>) => {
      if (next.page !== undefined || next.pageSize !== undefined) {
        setPage(next.page ?? query.page, next.pageSize ?? query.pageSize);
      }
      if ("sorter" in next) setSorter(next.sorter);
      if ("keyword" in next) setKeyword(next.keyword);
    },
    [query.page, query.pageSize, setPage, setSorter, setKeyword],
  );

  const onFiltersChange = useCallback(
    (antdFilters: Record<string, FilterValue | null>) => {
      setFilters(normalizeAntdFilters<EnrollTableFilters>(antdFilters));
      setPage(1, query.pageSize);
    },
    [setFilters, setPage, query.pageSize],
  );

  // =========================
  // 9) 对外输出（页面层直接消费）
  // =========================
  return {
    table: {
      bizKey,
      columns,
      dataSource: local.list,
      rowKey: "id" as const,
      total: local.total,
      loading: tableData.loading,
      error: tableData.error,
      query,

      onQueryChange,
      onFiltersChange,

      setKeyword,
      resetQuery,
      reload: tableData.reload,

      columnPrefs,
      exportCsv: exporter.exportCsv,
    },

    // ✅ 暴露 actions：页面层可复用（比如：详情页复用同一套 loading）
    applyActions,
  };
}
