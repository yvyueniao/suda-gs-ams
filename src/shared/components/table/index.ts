// src/shared/components/table/index.ts
/**
 * Table Module Public Exports
 *
 * 约定：
 * - 页面 / 业务侧只从这里 import（禁止深层路径引用）
 * - 本模块 =「前端通用表格领域能力」
 *
 * 模块边界：
 * - ❌ 不绑定后端字段名（records / pageNum / code 等）
 * - ❌ 不做鉴权判断（只做 UI 控制）
 * - ✅ 只认前端统一模型：TableQuery / ListResult
 *
 * 当前模式（你们现在用的）：
 * - ✅ 前端分页 / 搜索 / 筛选 / 排序 / 导出
 * - 后端可以返回全量 rows（推荐），或返回你们想要的任意格式（由 listAdapter 统一）
 *
 * 后端差异：
 * - 统一在 shared/http/listAdapter.ts 中处理
 */

// ======================================================
// types（前端表格领域统一类型）
// ======================================================
export type {
  // 查询 / 返回
  TableQuery,
  ListResult,
  TableFetcher,

  // 排序 / 分页
  TableSorter,
  TableSortOrder,
  TablePageState,

  // 列预设
  TableColumnPreset,
} from "./types";

// ======================================================
// constants（稳定常量）
// ======================================================
export {
  TABLE_DEFAULT_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
  TABLE_COLUMN_PERSIST_PREFIX,
  TABLE_KEYWORD_DEBOUNCE_MS,
} from "./constants";

// ======================================================
// hooks（逻辑层）
// ======================================================

// 查询状态
export { useTableQuery } from "./useTableQuery";

// 数据加载（请求态）
// - 你们当前如果是“后端全量”，也可以用 useTableData 只请求一次，再走本地查询
export { useTableData } from "./useTableData";

// 列偏好（显示/隐藏/顺序/宽度持久化）
export { useColumnPrefs } from "./useColumnPrefs";

// 列宽拖拽（pointer 方案，兼容 fixed sticky）
export { useResizableColumns } from "./useResizableColumns";

// 导出（⚠️ 主要用于“后端分页接口”跨页循环拉取）
// - 你们当前是“前端分页/导出”，通常更推荐用 useLocalExport + exportCsv
export { useTableExport } from "./useTableExport";

// ✅ 前端本地查询适配器（后端全量专用：前端分页/搜索/筛选/排序）
export { applyLocalQuery } from "./localQuery";

// ✅ 前端本地导出（后端全量专用：基于 filtered 全量导出）
export { useLocalExport } from "./useLocalExport";

// ======================================================
// components（UI 组件）
// ======================================================
export { SmartTable } from "./SmartTable";
export { TableToolbar } from "./TableToolbar";
export { ColumnSettings } from "./ColumnSettings";

// ✅ 操作列（通用 Action 渲染）
export { ActionCell } from "./ActionCell";

// ======================================================
// utils（纯工具，无 React）
// ======================================================

// 列持久化（localStorage 协议）
export {
  loadColumnState,
  saveColumnState,
  getColumnPersistKey,
} from "./columnPersist";

// CSV 导出（前端本地导出主力）
export { exportCsv } from "./exportCsv";
