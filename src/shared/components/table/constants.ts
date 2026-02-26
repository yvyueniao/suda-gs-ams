// src/shared/components/table/constants.ts
/**
 * Table Domain Constants
 *
 * 说明：
 * - 这里只放“表格领域通用且稳定”的常量
 * - 不包含任何业务含义（activity / user / feedback 等）
 * - 不包含任何后端字段名或协议约定
 */

/** 默认每页条数 */
export const TABLE_DEFAULT_PAGE_SIZE = 20;

/** 分页可选条数（用于 Pagination / PageSize 切换） */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500];

/**
 * 默认初始查询状态（可选使用）
 * 注意：
 * - 这里只给出“值常量”，不强制所有地方必须使用
 * - 具体初始化逻辑由 useTableQuery 决定
 */
export const TABLE_DEFAULT_QUERY = {
  page: 1,
  pageSize: TABLE_DEFAULT_PAGE_SIZE,
};

/**
 * 表格列持久化相关常量
 * - 仅用于生成 localStorage key
 */
export const TABLE_COLUMN_PERSIST_PREFIX = "table-columns";

/**
 * 模糊搜索防抖时间（ms）
 * - 仅作为建议值，是否使用由 useTableData 决定
 */
export const TABLE_KEYWORD_DEBOUNCE_MS = 300;
