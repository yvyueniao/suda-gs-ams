// src/shared/components/table/index.ts
/**
 * Table Module Public Exports
 *
 * 约定：
 * - 页面/业务侧只从这里 import（不要深层路径引用），便于后续重构不炸调用方
 * - 这里导出：
 *   1) 通用类型（types.ts）
 *   2) 常量（constants.ts）
 *   3) hooks（useTableQuery/useTableData）
 *   4) 组件（SmartTable/TableToolbar）
 *   5) 列持久化工具（columnPersist）
 *
 * 注意：
 * - 本模块不绑定后端字段名（records/pageNum/code 等都不应出现在 table 目录）
 * - 后端差异统一放在 shared/http/listAdapter.ts 中处理
 */

// types
export type {
  // 查询与返回
  TableQuery,
  ListResult,
  TableFetcher,

  // 筛选/排序/分页
  TableSorter,
  TableSortOrder,
  TablePageState,

  // 列增强
  TableColumnPreset,
} from "./types";

// constants
export { TABLE_DEFAULT_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "./constants";

// hooks
export { useTableQuery } from "./useTableQuery";
export { useTableData } from "./useTableData";

// components
export { SmartTable } from "./SmartTable";
export { TableToolbar } from "./TableToolbar";

// utils
export {
  loadColumnState,
  saveColumnState,
  getColumnPersistKey,
} from "./columnPersist";
