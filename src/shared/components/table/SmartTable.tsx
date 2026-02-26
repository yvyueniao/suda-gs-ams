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

  onFiltersChange?: (filters: Record<string, FilterValue | null>) => void;

  pagination?: false | Partial<TablePaginationConfig>;

  className?: string;
  style?: React.CSSProperties;

  rowSelection?: TableProps<T>["rowSelection"];

  size?: "small" | "middle" | "large";
  emptyText?: string;

  bizKey?: string;
  enableColumnResize?: boolean;
  minColumnWidth?: number;

  tableLayout?: TableProps<T>["tableLayout"];
  scroll?: TableProps<T>["scroll"];
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

  // ✅ 关键：以 query.page/pageSize 为最终真相源（不会被外部 pagination.current 覆盖）
  const mergedPagination: TablePaginationConfig | false = useMemo(() => {
    if (pagination === false) return false;

    const base = (pagination ?? {}) as Partial<TablePaginationConfig>;

    return {
      ...base,
      current: query.page ?? 1,
      pageSize: query.pageSize ?? TABLE_DEFAULT_PAGE_SIZE,
      total,
      showSizeChanger: true,
      pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS.map(String),
      showTotal: (t) => `共 ${t} 条`,
    };
  }, [pagination, query.page, query.pageSize, total]);

  const handleChange = (
    p: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<T> | SorterResult<T>[],
    _extra: TableCurrentDataSource<T>,
  ) => {
    // ✅ 1) 先把 filters 透传给页面（如果页面需要）
    onFiltersChange?.(filters);

    // ✅ 2) 先抛 sorter + filters（允许上层 setFilters 内部 reset page=1）
    // ⚠️ 注意：filters 这里不强类型约束，直接作为 query.filters 透传给上层
    const nextMeta: Partial<TableQuery<F>> = {
      sorter: toTableSorter<T>(sorter),
    };
    (nextMeta as any).filters = filters;

    onQueryChange(nextMeta);

    // ✅ 3) 再抛 page/pageSize（强制以用户点击的页码为准，覆盖任何 reset）
    const nextPage: Partial<TableQuery<F>> = {};
    if (typeof p.current === "number") nextPage.page = p.current;
    if (typeof p.pageSize === "number") nextPage.pageSize = p.pageSize;

    onQueryChange(nextPage);
  };

  const { columns: resizableColumns, components } = useResizableColumns<T>({
    bizKey,
    columns,
    enabled: enableColumnResize,
    minWidth: minColumnWidth,
  });

  const resolvedTableLayout = useMemo(() => {
    if (tableLayout) return tableLayout;
    return enableColumnResize ? "fixed" : "auto";
  }, [enableColumnResize, tableLayout]);

  const resolvedScroll = useMemo<TableProps<T>["scroll"]>(() => {
    if (scroll) return scroll;
    if (enableColumnResize) return { x: 1200 };
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
