// src/shared/components/table/SmartTable.tsx
import React, { useMemo } from "react";
import { Alert, Table } from "antd";

import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
  FilterValue,
  TableCurrentDataSource,
} from "antd/es/table/interface";
import type { TableProps } from "antd/es/table";

import type { TableQuery, TableSorter } from "./types";
import { TABLE_DEFAULT_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "./constants";
import { useResizableColumns } from "./useResizableColumns";

export type SmartTableProps<
  T extends object,
  F extends Record<string, any> = Record<string, any>,
> = {
  columns: ColumnsType<T>;
  dataSource: T[];
  rowKey: string | ((record: T) => string);

  query: TableQuery<F>;
  total: number;

  loading?: boolean;
  error?: unknown;

  /**
   * 只负责把“分页/排序（以及你愿意的话 filters）”回传给上层
   * 上层一般对接：useTableQuery.setPage/setSorter/setFilters
   */
  onQueryChange: (next: Partial<TableQuery<F>>) => void;

  /**
   * ✅ filters 变化抛出去（用于“受控筛选”）
   * 说明：
   * - antd 的 filters 结构是 Record<string, FilterValue | null>
   * - 业务可以在页面层把它映射成你自己的 query.filters
   * - 不在 SmartTable 内部硬编码映射规则，保持解耦
   */
  onFiltersChange?: (filters: Record<string, FilterValue | null>) => void;

  /**
   * ✅ 支持关闭分页：pagination={false}
   * 也支持只传 Partial<TablePaginationConfig>
   */
  pagination?: false | Partial<TablePaginationConfig>;

  className?: string;
  style?: React.CSSProperties;

  rowSelection?: TableProps<T>["rowSelection"];

  size?: "small" | "middle" | "large";
  emptyText?: string;

  /** ✅ 列宽拖拽：表格唯一 key（用于 localStorage 持久化） */
  bizKey?: string;
  /** ✅ 是否开启列宽拖拽 */
  enableColumnResize?: boolean;
  /** ✅ 最小列宽 */
  minColumnWidth?: number;

  /** 透传给 antd Table 的 tableLayout（默认 auto；开启拖拽时建议 fixed） */
  tableLayout?: TableProps<T>["tableLayout"];

  /** ✅ 透传 antd Table 的 scroll（用于固定列/横向滚动） */
  scroll?: TableProps<T>["scroll"];

  /** ✅ 透传 antd Table 的 sticky（表头吸顶/固定列更稳） */
  sticky?: TableProps<T>["sticky"];
};

function getErrorMessage(e: unknown) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object" && e && "message" in e) {
    const msg = (e as any).message;
    if (typeof msg === "string") return msg;
  }
  return "加载失败，请稍后重试";
}

function toTableSorter<T extends object>(
  sorter: SorterResult<T> | SorterResult<T>[] | undefined,
): TableSorter | undefined {
  const s = Array.isArray(sorter) ? sorter[0] : sorter;
  if (!s?.order) return undefined;

  const fieldRaw = s.field;
  let field: string | undefined;

  if (typeof fieldRaw === "string") field = fieldRaw;
  else if (typeof fieldRaw === "number") field = String(fieldRaw);
  else if (Array.isArray(fieldRaw) && fieldRaw.length > 0) {
    const first = fieldRaw[0];
    field =
      typeof first === "string"
        ? first
        : typeof first === "number"
          ? String(first)
          : undefined;
  }

  return { field, order: s.order ?? null };
}

export function SmartTable<
  T extends object,
  F extends Record<string, any> = Record<string, any>,
>(props: SmartTableProps<T, F>) {
  const {
    columns,
    dataSource,
    rowKey,
    query,
    total,
    loading,
    error,
    onQueryChange,
    onFiltersChange,
    pagination = {},
    className,
    style,
    rowSelection,
    size = "small",
    emptyText = "暂无数据",

    bizKey,
    enableColumnResize = false,
    minColumnWidth = 80,
    tableLayout,

    scroll,
    sticky,
  } = props;

  const mergedPagination: TablePaginationConfig | false = useMemo(() => {
    if (pagination === false) return false;

    return {
      current: query.page ?? 1,
      pageSize: query.pageSize ?? TABLE_DEFAULT_PAGE_SIZE,
      total,
      showSizeChanger: true,
      pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS.map(String),
      showTotal: (t) => `共 ${t} 条`,
      ...(pagination ?? {}),
    };
  }, [pagination, query.page, query.pageSize, total]);

  const handleChange = (
    p: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<T> | SorterResult<T>[],
    _extra: TableCurrentDataSource<T>,
  ) => {
    // ✅ 关键：把 filters 抛出去，否则页面的 filteredValue（受控）不会更新
    onFiltersChange?.(filters);

    const next: Partial<TableQuery<F>> = {};
    if (typeof p.current === "number") next.page = p.current;
    if (typeof p.pageSize === "number") next.pageSize = p.pageSize;
    next.sorter = toTableSorter<T>(sorter);

    onQueryChange(next);
  };

  // ✅ 列宽拖拽（可选）
  const { columns: resizableColumns, components } = useResizableColumns<T>({
    bizKey,
    columns,
    enabled: enableColumnResize,
    minWidth: minColumnWidth,
  });

  // ✅ 开启拖拽时强烈建议 fixed（否则改 th.style.width 可能不生效）
  const resolvedTableLayout = useMemo(() => {
    if (tableLayout) return tableLayout;
    return enableColumnResize ? "fixed" : "auto";
  }, [enableColumnResize, tableLayout]);

  // ✅ 默认 scroll：保证有横向滚动能力，配合 fixed="right" 更稳
  const resolvedScroll = useMemo<TableProps<T>["scroll"]>(() => {
    if (scroll) return scroll;

    // 开启列宽拖拽时：让 x 一定是 number（更稳），并保证可横向滚动
    if (enableColumnResize) {
      // 没有传 scroll.x 的情况下，给一个“够用的默认宽度”
      // （比 x:"max-content" 更稳定，配合 fixed tableLayout）
      return { x: 1200 };
    }

    return { x: "max-content" };
  }, [enableColumnResize, scroll]);

  return (
    <div className={className} style={style}>
      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Alert type="error" showIcon message={getErrorMessage(error)} />
        </div>
      ) : null}

      <Table<T>
        components={components}
        tableLayout={resolvedTableLayout}
        columns={resizableColumns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        size={size}
        rowSelection={rowSelection}
        pagination={mergedPagination}
        onChange={handleChange}
        scroll={resolvedScroll}
        sticky={sticky}
        locale={{ emptyText }}
      />
    </div>
  );
}
