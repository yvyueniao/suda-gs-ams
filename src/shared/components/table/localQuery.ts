// src/shared/components/table/localQuery.ts
/**
 * localQuery
 *
 * 适用场景（你们当前系统的核心前提）：
 * - 后端只返回全量数据
 * - 分页 / 搜索 / 筛选 / 排序 全部在前端完成
 *
 * 目标：
 * - 将 rawRows + TableQuery 转换为：
 *   1) filtered: 经过 keyword/filters/sorter 后的“全量结果”（用于导出/统计）
 *   2) total: filtered 的总数（用于分页组件）
 *   3) list: 当前页数据（用于 Table 渲染）
 *
 * 设计原则：
 * - 不绑定业务字段名：由调用方通过 options 指定如何做 keyword 匹配/filters 匹配/sort 取值
 * - 默认策略“能用但保守”：只对 string/number 做排序；filter 只做等值或数组包含；keyword 默认扫可展示字段
 */

import type { TableQuery, TableSorter } from "./types";

export type LocalQueryOptions<
  T extends object,
  F extends Record<string, any>,
> = {
  /**
   * ✅ keyword 搜索：告诉工具“拿哪些字段做模糊匹配”
   * - 返回一组可搜索的字符串片段（会 join 后 contains）
   * - 建议只返回用户可见字段，避免误匹配
   */
  getSearchTexts?: (row: T) => Array<string | number | null | undefined>;

  /**
   * ✅ filters 匹配：完全交给业务决定（最解耦）
   * - 返回 true 表示通过
   * - 不提供则走默认策略（对 filters 每个 key 做等值/数组包含匹配）
   */
  matchFilters?: (row: T, filters: Partial<F>) => boolean;

  /**
   * ✅ sorter：告诉工具如何从 row 上取排序值
   * - 不提供则默认按 sorter.field 直接取 (row as any)[field]
   */
  getSortValue?: (row: T, sorter: TableSorter) => unknown;

  /**
   * filters 默认匹配时，是否忽略空值（默认 true）
   * - 例如 filters = { status: undefined } 不参与过滤
   */
  ignoreEmptyFilterValue?: boolean;

  /**
   * keyword 匹配是否大小写不敏感（默认 true）
   */
  keywordCaseInsensitive?: boolean;

  /**
   * keyword 是否 trim（默认 true）
   */
  keywordTrim?: boolean;

  /**
   * 自定义比较器（如果你要对时间/枚举做特殊排序）
   * - 返回 <0 / 0 / >0
   */
  compare?: (a: T, b: T, sorter: TableSorter) => number;
};

export type LocalQueryResult<T extends object> = {
  /** 经过 keyword/filters/sorter 后的全量结果（用于导出/统计） */
  filtered: T[];
  /** filtered 总数 */
  total: number;
  /** 当前页数据（slice 后） */
  list: T[];
};

/** 判断一个值是否“空”（用于默认 filter 忽略策略） */
function isEmptyValue(v: any) {
  return v === null || v === undefined || v === "";
}

function normalizeText(
  s: string,
  caseInsensitive: boolean,
  trim: boolean,
): string {
  const t = trim ? s.trim() : s;
  return caseInsensitive ? t.toLowerCase() : t;
}

/**
 * 默认 filters 匹配（保守）
 * - 对 filters 的每个 key：
 *   - filterVal 是数组：rowVal 必须包含在数组里
 *   - 否则：rowVal === filterVal
 * - rowVal 若为数组：支持数组包含（rowVal.includes(filterVal)）
 */
function defaultMatchFilters<T extends object, F extends Record<string, any>>(
  row: T,
  filters: Partial<F>,
  ignoreEmpty: boolean,
): boolean {
  const entries = Object.entries(filters ?? {});
  for (const [k, filterVal] of entries) {
    if (ignoreEmpty && isEmptyValue(filterVal)) continue;

    const rowVal = (row as any)?.[k];

    // filterVal 是数组 => rowVal 必须在其中
    if (Array.isArray(filterVal)) {
      if (!filterVal.includes(rowVal)) return false;
      continue;
    }

    // rowVal 是数组 => 必须包含 filterVal
    if (Array.isArray(rowVal)) {
      if (!rowVal.includes(filterVal)) return false;
      continue;
    }

    // 默认等值
    if (rowVal !== filterVal) return false;
  }
  return true;
}

/** 默认排序取值：按 sorter.field 直接取 row[field] */
function defaultGetSortValue<T extends object>(row: T, sorter: TableSorter) {
  const field = sorter.field;
  if (!field) return undefined;
  return (row as any)?.[field];
}

/** 默认比较器：仅对 number/string/date 做稳定比较 */
function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  // Date
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  // number
  if (typeof a === "number" && typeof b === "number") return a - b;

  // string
  const sa = String(a);
  const sb = String(b);
  return sa.localeCompare(sb, "zh-Hans-CN");
}

function applySorter<T extends object>(
  rows: T[],
  sorter: TableSorter | undefined,
  getSortValue: (row: T, sorter: TableSorter) => unknown,
  customCompare?: (a: T, b: T, sorter: TableSorter) => number,
): T[] {
  if (!sorter?.field || !sorter.order) return rows;

  const orderFactor = sorter.order === "ascend" ? 1 : -1;

  const sorted = [...rows].sort((ra, rb) => {
    if (customCompare) {
      return customCompare(ra, rb, sorter) * orderFactor;
    }

    const va = getSortValue(ra, sorter);
    const vb = getSortValue(rb, sorter);
    return defaultCompare(va, vb) * orderFactor;
  });

  return sorted;
}

function applyKeyword<T extends object>(
  rows: T[],
  keyword: string | undefined,
  getSearchTexts:
    | ((row: T) => Array<string | number | null | undefined>)
    | undefined,
  caseInsensitive: boolean,
  trim: boolean,
): T[] {
  if (!keyword) return rows;

  const kw = normalizeText(keyword, caseInsensitive, trim);
  if (!kw) return rows;

  // 如果业务没提供 getSearchTexts，则退化为“扫所有可枚举字段的 string/number”
  const getter =
    getSearchTexts ??
    ((row: T) => {
      const parts: Array<string | number> = [];
      for (const v of Object.values(row as any)) {
        if (typeof v === "string" || typeof v === "number") parts.push(v);
      }
      return parts;
    });

  return rows.filter((r) => {
    const parts = getter(r)
      .filter((x) => x !== null && x !== undefined)
      .map((x) => String(x));
    const hay = normalizeText(parts.join(" "), caseInsensitive, trim);
    return hay.includes(kw);
  });
}

function applyFilters<T extends object, F extends Record<string, any>>(
  rows: T[],
  filters: Partial<F> | undefined,
  matchFilters: ((row: T, filters: Partial<F>) => boolean) | undefined,
  ignoreEmpty: boolean,
): T[] {
  if (!filters || Object.keys(filters).length === 0) return rows;

  const matcher =
    matchFilters ??
    ((row: T, f: Partial<F>) => defaultMatchFilters(row, f, ignoreEmpty));

  return rows.filter((r) => matcher(r, filters));
}

function applyPaging<T extends object>(
  rows: T[],
  page: number | undefined,
  pageSize: number | undefined,
): T[] {
  const p = typeof page === "number" && page > 0 ? page : 1;
  const ps =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : rows.length;

  const start = (p - 1) * ps;
  if (start <= 0 && ps >= rows.length) return rows;
  return rows.slice(start, start + ps);
}

/**
 * applyLocalQuery
 *
 * @param rawRows - 后端返回的全量数据（或你缓存的全量）
 * @param query - TableQuery（keyword/filters/sorter/page/pageSize）
 * @param options - 本地处理策略配置
 */
export function applyLocalQuery<
  T extends object,
  F extends Record<string, any> = Record<string, any>,
>(
  rawRows: T[],
  query: TableQuery<F>,
  options?: LocalQueryOptions<T, F>,
): LocalQueryResult<T> {
  const rows = Array.isArray(rawRows) ? rawRows : [];

  const {
    getSearchTexts,
    matchFilters,
    getSortValue,
    ignoreEmptyFilterValue = true,
    keywordCaseInsensitive = true,
    keywordTrim = true,
    compare,
  } = options ?? {};

  // 1) keyword
  const afterKeyword = applyKeyword<T>(
    rows,
    query.keyword,
    getSearchTexts,
    keywordCaseInsensitive,
    keywordTrim,
  );

  // 2) filters
  const afterFilters = applyFilters<T, F>(
    afterKeyword,
    query.filters,
    matchFilters,
    ignoreEmptyFilterValue,
  );

  // 3) sorter
  const afterSorter = applySorter<T>(
    afterFilters,
    query.sorter,
    getSortValue ?? defaultGetSortValue,
    compare,
  );

  // 4) paging
  const list = applyPaging<T>(afterSorter, query.page, query.pageSize);

  return {
    filtered: afterSorter,
    total: afterSorter.length,
    list,
  };
}
