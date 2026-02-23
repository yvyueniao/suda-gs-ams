// src/features/profile/hooks/useProfileMyActivitiesTable.ts
/**
 * useProfileMyActivitiesTable
 *
 * ✅ 文件定位
 * - 个人中心「我的活动/讲座」表格的“编排层 Hook”（ProfilePage 直接用它）
 * - 只做：查询状态管理、拉数、本地过滤/排序/分页、列配置持久化、导出、详情弹窗编排
 * - 不做：UI 渲染（交给 SmartTable / TableToolbar / ColumnSettings / ActivityDetailModal）
 *
 * ✅ 数据流（从上到下）
 * 1) useTableQuery：维护 query（page/pageSize/keyword/filters/sorter）
 * 2) useTableData：一次性拉取全量 rawRows（autoDeps="reload" => query 变化不触发请求）
 * 3) queryMyActivities：前端本地过滤/排序/分页，得到 filtered/total/list
 * 4) useColumnPrefs：列显隐/顺序/宽度（localStorage 持久化）
 * 5) buildMyActivitiesColumns：生成基础 columns（ActionCell 触发 “详情”）
 * 6) 受控筛选闭环：
 *    - query.filters -> antd filteredValue（控制勾选态）
 *    - antd filters -> onFiltersChange -> setFilters（回写 query.filters）
 * 7) useLocalExport：导出 CSV（全量模式用 filtered 导出）
 * 8) 详情弹窗：
 *    - openDetail：打开弹窗并请求详情
 *    - closeDetail：关闭弹窗并“作废”未完成请求，防止串线
 *
 * ✅ 本次修复 / 新增
 * - ✅ 引入 useAsyncMapAction：为“详情”提供【按行独立 loading + 防连点】能力
 * - ✅ actions 注入 detailAction：columns.tsx 可直接使用 loading={detailAction.isLoading(id)}
 * - ✅ openDetail 显式约束返回类型（MyActivitiesActions["openDetail"]），避免推断成 Promise<unknown>
 *
 * ✅ 关键设计点
 * - 全量拉取 + 本地查询：分页/搜索/筛选不打接口，体验顺滑
 * - 详情请求防串线：用户连续点不同“详情”，旧请求返回不会覆盖新请求
 *
 * ✅ 本次补齐（你刚提到的“优先用后端返回信息”）
 * - 后端可能返回：{ code:200, msg:"未找到活动", data:{activity:null} }
 * - request<T>() 一般会“只解 data”，所以 getActivityDetail 可能拿到的是 null
 * - 这里约定：detail 可以为 null，弹窗保持 open，UI 层用 Empty 展示（你现在的 ActivityDetailModal 已支持）
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { FilterValue, Key } from "antd/es/table/interface";
import type { ColumnsType, ColumnType } from "antd/es/table";

import {
  useTableQuery,
  useTableData,
  useColumnPrefs,
  useLocalExport,
  type TableQuery,
  type TableSorter,
} from "../../../shared/components/table";

import { useAsyncMapAction } from "../../../shared/actions";

import type {
  ActivityDetail,
  MyActivityFilters,
  MyActivityItem,
  ActivityType,
  ApplicationState,
} from "../types";
import { getMyApplications, getActivityDetail } from "../api";

import { myActivitiesTablePresets } from "../table/presets";
import {
  buildMyActivitiesColumns,
  type MyActivitiesActions,
} from "../table/columns";
import { queryMyActivities, mapMyActivityForExport } from "../table/helpers";

const BIZ_KEY = "profile.myActivities";

/** 把 antd 的 filter value 归一成你们的字段类型 */
function normalizeFilterValue<T>(
  raw: unknown,
  kind: "number" | "boolean",
): T | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (kind === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return (Number.isFinite(n) ? (n as any) : undefined) as T | undefined;
  }

  if (typeof raw === "boolean") return raw as any;
  if (raw === "true") return true as any;
  if (raw === "false") return false as any;
  return undefined;
}

/** 把 query.filters 的单值映射成 antd filteredValue（单选列） */
function toFilteredValue(v: unknown): FilterValue | null {
  return v === undefined ? null : ([v] as Key[]);
}

type ColumnWithFilteredValue<T> = ColumnType<T> & {
  filteredValue?: FilterValue | null;
};

export function useProfileMyActivitiesTable() {
  // =====================================================
  // 1) 查询状态（统一 TableQuery）
  // =====================================================
  const {
    query,
    setPage,
    setSorter,
    setFilters,
    setKeyword,
    reset: resetQuery,
  } = useTableQuery<MyActivityFilters>({
    initial: {
      page: 1,
      pageSize: 10,
      keyword: "",
      filters: undefined,
      sorter: undefined,
    },
  });

  // =====================================================
  // 2) 拉全量数据（全量模式：fetcher 忽略 page/pageSize）
  // =====================================================
  const fetcher = useCallback(async (_q: TableQuery<MyActivityFilters>) => {
    const rows = await getMyApplications();
    return { list: rows, total: rows.length };
  }, []);

  const {
    list: rawRows,
    loading,
    error,
    reload,
  } = useTableData<MyActivityItem, MyActivityFilters>(query, fetcher, {
    auto: true,
    // ✅ 全量拉取 + 本地查询：query 变化不重复请求，只在首次+手动 reload 时请求
    autoDeps: "reload",
  });

  // =====================================================
  // 3) 本地查询引擎（filtered / total / list）
  // =====================================================
  const { filtered, total, list } = useMemo(() => {
    return queryMyActivities(rawRows ?? [], query);
  }, [rawRows, query]);

  // =====================================================
  // 4) 列预设 + 列偏好（显隐/顺序/宽度持久化）
  // =====================================================
  const presets = myActivitiesTablePresets;

  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault: resetColumns,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<MyActivityItem>(BIZ_KEY, presets, { version: 1 });

  // =====================================================
  // 5) 详情弹窗状态 + 防串线机制
  // =====================================================
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ 关键：detail 允许为 null（“未找到活动”）
  const [detail, setDetail] = useState<ActivityDetail | null>(null);

  const [currentRow, setCurrentRow] = useState<MyActivityItem | null>(null);

  /**
   * ✅ 防串线：详情请求版本号
   * - openDetail 会生成 reqId
   * - closeDetail 会递增，使之前未完成请求全部“作废”
   */
  const detailReqIdRef = useRef(0);

  /**
   * ✅ 行内异步动作：按 activityId 独立 loading（给 ActionCell 用）
   */
  const detailAction = useAsyncMapAction<number, void>({
    errorMessage: "加载详情失败",
  });

  /**
   * ✅ openDetail：显式约束类型（避免 Promise<unknown>）
   * - 返回 Promise<void>（符合 MyActivitiesActions 定义）
   * - 详情接口可能返回 null：此时弹窗保持 open，detail 置 null（UI 显示 Empty）
   */
  const openDetail = useCallback<MyActivitiesActions["openDetail"]>(
    async (activityId: number) => {
      const reqId = ++detailReqIdRef.current;

      // ✅ 从用户当前看到的 filtered 中找“当前行”
      const row =
        (filtered ?? []).find((x) => x.activityId === activityId) ?? null;
      setCurrentRow(row);

      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      try {
        await detailAction.run(activityId, async () => {
          const d = await getActivityDetail(activityId);

          // ✅ 只接受“最新一次”请求的结果
          if (detailReqIdRef.current !== reqId) return;

          // ✅ 允许 d 为 null（后端返回 activity:null）
          setDetail((d ?? null) as ActivityDetail | null);
        });
      } finally {
        if (detailReqIdRef.current === reqId) {
          setDetailLoading(false);
        }
      }
    },
    [detailAction, filtered],
  );

  const closeDetail = useCallback(() => {
    // ✅ 作废所有未完成请求（避免关闭后旧请求回来又 setDetail）
    detailReqIdRef.current += 1;

    setDetailOpen(false);
    setDetailLoading(false);
    setDetail(null);
    setCurrentRow(null);
  }, []);

  // ✅ 兼容：仅获取详情数据（有些页面/旧逻辑会直接调用它）
  const fetchActivityDetail = useCallback(
    async (activityId: number) => getActivityDetail(activityId),
    [],
  );

  // =====================================================
  // 6) columns：基础 columns + 受控筛选闭环 + presets 应用
  // =====================================================
  const actions: MyActivitiesActions = useMemo(
    () => ({ openDetail, detailAction }),
    [openDetail, detailAction],
  );

  const baseColumns = useMemo(
    () => buildMyActivitiesColumns(actions),
    [actions],
  );

  const controlledColumns = useMemo(() => {
    const f = query.filters;

    // 约定：这些 key 必须与 columns 的 dataIndex/key 对应
    const filterMap: Record<string, unknown> = {
      type: f?.type,
      state: f?.state,
      checkIn: f?.checkIn,
      checkOut: f?.checkOut,
      getScore: f?.getScore,
    };

    const mapColumn = (
      c: ColumnType<MyActivityItem>,
    ): ColumnWithFilteredValue<MyActivityItem> => {
      const k = (c.dataIndex ?? c.key) as string | undefined;
      if (!k) return c as any;
      if (!(k in filterMap)) return c as any;

      return { ...c, filteredValue: toFilteredValue(filterMap[k]) };
    };

    return (baseColumns as ColumnsType<MyActivityItem>).map(mapColumn);
  }, [baseColumns, query.filters]);

  const columns = useMemo(() => {
    return applyPresetsToAntdColumns(
      controlledColumns as ColumnsType<MyActivityItem>,
    );
  }, [applyPresetsToAntdColumns, controlledColumns]);

  // =====================================================
  // 7) 导出 CSV（全量模式必须用 filtered）
  // =====================================================
  const {
    exporting,
    error: exportError,
    exportCsv: doExportCsv,
  } = useLocalExport<MyActivityItem>(filtered, presets, visibleKeys, {
    filenameBase: "我的活动报名记录",
    mapRow: (row) => mapMyActivityForExport(row),
  });

  const exportCsv = useCallback(() => {
    doExportCsv();
  }, [doExportCsv]);

  // =====================================================
  // 8) SmartTable 桥接：分页/排序回传（Partial TableQuery）
  // =====================================================
  const onQueryChange = useCallback(
    (next: Partial<TableQuery<MyActivityFilters>>) => {
      if (typeof next.page === "number" || typeof next.pageSize === "number") {
        setPage(next.page ?? query.page, next.pageSize ?? query.pageSize);
      }

      if ("sorter" in next) {
        setSorter(next.sorter as TableSorter | undefined);
      }
    },
    [query.page, query.pageSize, setPage, setSorter],
  );

  // =====================================================
  // 9) antd filters -> MyActivityFilters（闭环）
  // =====================================================
  const onFiltersChange = useCallback(
    (antdFilters: Record<string, FilterValue | null>) => {
      const pickFirst = (v: FilterValue | null) => {
        if (!v || !Array.isArray(v) || v.length === 0) return undefined;
        return v[0];
      };

      const next: MyActivityFilters = {
        type: normalizeFilterValue<ActivityType>(
          pickFirst(antdFilters.type),
          "number",
        ),
        state: normalizeFilterValue<ApplicationState>(
          pickFirst(antdFilters.state),
          "number",
        ),
        checkIn: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.checkIn),
          "boolean",
        ),
        checkOut: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.checkOut),
          "boolean",
        ),
        getScore: normalizeFilterValue<boolean>(
          pickFirst(antdFilters.getScore),
          "boolean",
        ),
      };

      const allEmpty = Object.values(next).every((x) => x === undefined);
      setFilters(allEmpty ? undefined : next);
    },
    [setFilters],
  );

  // =====================================================
  // 10) 重置（查询）
  // =====================================================
  const reset = useCallback(() => {
    resetQuery();
  }, [resetQuery]);

  // =====================================================
  // 对外返回
  // =====================================================
  return {
    // 表格基础
    bizKey: BIZ_KEY,
    presets,
    columns,
    list,
    total,
    loading,
    error,
    reload,

    // query
    query,
    setKeyword,
    setPage,
    setSorter,
    setFilters,
    reset,

    // SmartTable 事件桥接
    onQueryChange,
    onFiltersChange,

    // 列偏好
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetColumns,

    // 导出
    exporting,
    exportError,
    exportCsv,

    // 详情弹窗
    detailOpen,
    detailLoading,
    detail,
    currentRow,
    openDetail,
    closeDetail,

    // ✅ 给 columns.tsx / 页面层使用
    detailAction,

    // 兼容
    fetchActivityDetail,
  };
}
