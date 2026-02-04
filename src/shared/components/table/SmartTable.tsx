// src/shared/components/table/SmartTable.tsx
import React from "react";
import { Alert, Table } from "antd";
import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
  FilterValue,
  TableCurrentDataSource,
} from "antd/es/table/interface";
import type { TableQuery, TableSorter } from "./types";
import { TABLE_DEFAULT_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "./constants";

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

  pagination?: Partial<TablePaginationConfig>;
  className?: string;
  style?: React.CSSProperties;
  rowSelection?: any;

  size?: "small" | "middle" | "large";
  emptyText?: string;
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

/**
 * 将 antd sorter 转成我们内部 TableSorter（只做“单排序”最小实现）
 * - sorter.field 可能是 string | number | (string|number)[]
 * - 我们内部用 string 表达：能转就转，不能转就忽略
 */
function toTableSorter<T extends object>(
  sorter: SorterResult<T> | SorterResult<T>[] | undefined,
): TableSorter | undefined {
  const s = Array.isArray(sorter) ? sorter[0] : sorter;
  if (!s?.order) return undefined;

  // field 可能是 Key | Key[]（Key = string | number）
  const fieldRaw = s.field;
  let field: string | undefined;

  if (typeof fieldRaw === "string") {
    field = fieldRaw;
  } else if (typeof fieldRaw === "number") {
    // ✅ 允许 number（转成 string，避免类型炸裂）
    field = String(fieldRaw);
  } else if (Array.isArray(fieldRaw) && fieldRaw.length > 0) {
    // ✅ 只取第一个（最小实现），也可以 join(".")
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
    pagination,
    className,
    style,
    rowSelection,
    size = "small",
    emptyText = "暂无数据",
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
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<T> | SorterResult<T>[],
    _extra: TableCurrentDataSource<T>,
  ) => {
    const next: Partial<TableQuery<F>> = {};

    if (typeof p.current === "number") next.page = p.current;
    if (typeof p.pageSize === "number") next.pageSize = p.pageSize;

    next.sorter = toTableSorter<T>(sorter);

    onQueryChange(next);
  };

  return (
    <div className={className} style={style}>
      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Alert type="error" showIcon message={getErrorMessage(error)} />
        </div>
      ) : null}

      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        size={size}
        rowSelection={rowSelection}
        pagination={mergedPagination}
        onChange={handleChange}
        scroll={{ x: "max-content" }} // ✅ 移动端基本可读可用
        locale={{ emptyText }}
      />
    </div>
  );
}
