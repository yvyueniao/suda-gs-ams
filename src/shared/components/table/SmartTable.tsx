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

  onQueryChange: (next: Partial<TableQuery<F>>) => void;

  /** ✅ 新增：把 filters 变化抛出去（用于“受控筛选”） */
  onFiltersChange?: (filters: Record<string, FilterValue | null>) => void;

  pagination?: Partial<TablePaginationConfig>;
  className?: string;
  style?: React.CSSProperties;
  rowSelection?: any;

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

  /** ✅ 新增：透传 antd Table 的 scroll（用于固定列/横向滚动） */
  scroll?: TableProps<T>["scroll"];
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
    pagination,
    className,
    style,
    rowSelection,
    size = "small",
    emptyText = "暂无数据",

    bizKey,
    enableColumnResize = false,
    minColumnWidth = 80,
    tableLayout,

    // ✅ 新增：外部可控 scroll
    scroll,
  } = props;

  const mergedPagination: TablePaginationConfig = {
    current: query.page ?? 1,
    pageSize: query.pageSize ?? TABLE_DEFAULT_PAGE_SIZE,
    total,
    showSizeChanger: true,
    pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS.map(String),
    showTotal: (t) => `共 ${t} 条`,
    ...pagination,
  };

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

  // ✅ 关键：把 resizable hook 的 columns + components 真的喂给 Table
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

  // ✅ 默认 scroll：保证有横向滚动能力，配合 fixed="right" 才稳定
  const resolvedScroll = useMemo<TableProps<T>["scroll"]>(() => {
    // 外部传了就用外部（例如 { x: 1100 }）
    if (scroll) return scroll;
    // 否则默认 max-content（列多就自动横向滚动）
    return { x: "max-content" };
  }, [scroll]);

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
        locale={{ emptyText }}
      />
    </div>
  );
}
