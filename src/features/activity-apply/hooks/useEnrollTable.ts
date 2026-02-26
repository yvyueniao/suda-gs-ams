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
 * 2) 合并：生成 EnrollTableRow（包含 applyState / myApplication / successApplyNum）
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
  onOpenDetail?: (id: number) => void;
  onRegister?: (row: EnrollTableRow) => void | Promise<unknown>;
  onCancel?: (row: EnrollTableRow) => void | Promise<unknown>;
  applyActions?: ReturnType<typeof useApplyActions>;
  applyFlow?: ReturnType<typeof useApplyFlow>;

  /**
   * ✅ 新增：统一时间口径
   * - 用于“报名时间窗禁用”
   * - 页面层可每次 render 传 Date.now()
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
  } = useTableQuery<EnrollTableFilters>({});

  // =========================
  // 2) 数据拉取（一次拉全量）
  // =========================
  const fetcher: TableFetcher<EnrollTableRow, EnrollTableFilters> =
    useCallback(async (): Promise<ListResult<EnrollTableRow>> => {
      const [activities, myApps] = await Promise.all([
        searchAllActivities(),
        getMyApplications(),
      ]);

      // ✅ mergeEnrollRows 内部已经生成 successApplyNum
      const list = mergeEnrollRows(activities ?? [], myApps ?? []);
      return { list, total: list.length };
    }, []);

  const tableData = useTableData<EnrollTableRow, EnrollTableFilters>(
    query,
    fetcher,
    { autoDeps: "reload" },
  );

  // =========================
  // 3) 本地过滤/排序/搜索/分页
  // =========================
  const local = useMemo(() => {
    return applyLocalQuery<EnrollTableRow, EnrollTableFilters>(
      tableData.list ?? [],
      query,
      { getSearchTexts, matchFilters, getSortValue },
    );
  }, [tableData.list, query]);

  // =========================
  // 4) 列偏好
  // =========================
  const columnPrefs = useColumnPrefs<EnrollTableRow>(
    bizKey,
    activityApplyTablePresets,
    { version: 3 },
  );

  // =========================
  // 5) 行动作（统一来源）
  // =========================
  const innerActions = useApplyActions({
    onChanged: async () => {
      await tableData.reload();
    },
    muteActionErrorToast: true,
  });

  const applyActions = options?.applyActions ?? innerActions;

  // =========================
  // 6) columns 组装
  // =========================
  const columns = useMemo(() => {
    const base = buildEnrollColumns({
      nowMs: options?.nowMs ?? Date.now(),

      onDetail: (row) => options?.onOpenDetail?.(row.id),

      onRegister: async (row) => {
        if (options?.onRegister) return options.onRegister(row);
        return applyActions.register(row.id);
      },

      onCancel: async (row) => {
        if (options?.onCancel) return options.onCancel(row);
        if (options?.applyFlow) {
          return options.applyFlow.startCancelWithNotify(row.id);
        }
        return applyActions.cancel(row.id);
      },

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
  // 7) 导出（基于过滤后的数据）
  // =========================
  const exporter = useLocalExport<EnrollTableRow>(
    local.filtered,
    activityApplyTablePresets,
    columnPrefs.visibleKeys,
    { filenameBase: "活动讲座报名列表" },
  );

  // =========================
  // 8) 受控回写
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
  // 9) 对外输出
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

    applyActions,
  };
}
