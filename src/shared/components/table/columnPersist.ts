// src/shared/components/table/columnPersist.ts
/**
 * Column Persistence
 *
 * 目标：
 * - 持久化表格的列偏好（隐藏 / 宽度 / 顺序）
 * - 仅负责 localStorage 读写与状态结构，不关心 UI / antd
 *
 * 设计原则：
 * - bizKey 作为表格唯一标识（route / menuKey / 页面自定义）
 * - persisted > 默认配置
 * - 宽度 / 顺序 / 隐藏 解耦存储
 */

import { TABLE_COLUMN_PERSIST_PREFIX } from "./constants";

/** 单列的可持久化状态 */
export type PersistedColumnState = {
  /** 列唯一 key（必须稳定） */
  key: string;

  /** 是否隐藏（true = 隐藏） */
  hidden?: boolean;

  /** 列宽（px） */
  width?: number;

  /** 排序序号（越小越靠前） */
  order?: number;
};

/** 整个表格的列状态 */
export type PersistedTableColumnState = {
  /** 配置版本（列结构变更时 bump） */
  version: number;

  /** 最近更新时间 */
  updatedAt: number;

  /** 列状态集合 */
  columns: PersistedColumnState[];
};

/**
 * 生成 localStorage key
 * @example
 * table-columns:profile.myActivities
 */
export function getColumnPersistKey(bizKey: string) {
  return `${TABLE_COLUMN_PERSIST_PREFIX}:${bizKey}`;
}

/**
 * 读取列状态（安全）
 */
export function loadColumnState(
  bizKey: string,
): PersistedTableColumnState | null {
  try {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(getColumnPersistKey(bizKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedTableColumnState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.columns)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * 保存列状态
 */
export function saveColumnState(
  bizKey: string,
  state: PersistedTableColumnState,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getColumnPersistKey(bizKey), JSON.stringify(state));
}

/* ------------------------------------------------------------------ */
/* ------------------------- 工具函数区 ------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * 创建“全量默认列状态”
 * - 所有列默认显示
 * - order 按传入顺序
 */
export function createDefaultColumnState(
  keys: string[],
  version = 1,
): PersistedTableColumnState {
  return {
    version,
    updatedAt: Date.now(),
    columns: keys.map((k, idx) => ({
      key: k,
      hidden: false,
      order: idx,
    })),
  };
}

/**
 * 从 state 中提取：key -> PersistedColumnState 映射
 */
export function mapColumnState(
  state: PersistedTableColumnState | null,
): Map<string, PersistedColumnState> {
  const map = new Map<string, PersistedColumnState>();
  if (!state?.columns) return map;

  for (const c of state.columns) {
    map.set(c.key, c);
  }
  return map;
}

/**
 * 更新 / 插入单列宽度
 * - 保留 hidden / order
 */
export function upsertColumnWidth(
  prev: PersistedTableColumnState | null,
  colKey: string,
  width: number,
): PersistedTableColumnState {
  const base: PersistedTableColumnState =
    prev ??
    ({
      version: 1,
      updatedAt: Date.now(),
      columns: [],
    } as PersistedTableColumnState);

  const columns = Array.isArray(base.columns) ? [...base.columns] : [];
  const idx = columns.findIndex((c) => c.key === colKey);

  if (idx >= 0) {
    columns[idx] = {
      ...columns[idx],
      width,
    };
  } else {
    columns.push({ key: colKey, width });
  }

  return {
    ...base,
    updatedAt: Date.now(),
    columns,
  };
}

/**
 * ✅ 新增：批量写入列顺序（order）
 * - orderedKeys 按顺序给出“全量 keys”（建议包含隐藏列）
 * - 会更新已有列的 order；不存在则插入（保留 hidden/width）
 *
 * @example
 * const next = upsertColumnOrders(prevState, ["title","status","date"]);
 */
export function upsertColumnOrders(
  prev: PersistedTableColumnState | null,
  orderedKeys: string[],
  version = 1,
): PersistedTableColumnState {
  const base: PersistedTableColumnState =
    prev ??
    ({
      version,
      updatedAt: Date.now(),
      columns: [],
    } as PersistedTableColumnState);

  const columns = Array.isArray(base.columns) ? [...base.columns] : [];

  const index = new Map<string, number>();
  columns.forEach((c, i) => index.set(c.key, i));

  orderedKeys.forEach((key, order) => {
    const idx = index.get(key);
    if (typeof idx === "number") {
      columns[idx] = { ...columns[idx], order };
    } else {
      columns.push({ key, order });
    }
  });

  return {
    ...base,
    version: base.version ?? version,
    updatedAt: Date.now(),
    columns,
  };
}

/**
 * 从 state 中提取宽度映射
 * @returns Map<colKey, width>
 */
export function extractColumnWidthMap(
  state: PersistedTableColumnState | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!state?.columns) return map;

  for (const c of state.columns) {
    if (typeof c.width === "number" && c.width > 0) {
      map.set(c.key, c.width);
    }
  }
  return map;
}

/**
 * 从 state 中提取“隐藏列 key 集合”
 */
export function extractHiddenKeySet(
  state: PersistedTableColumnState | null,
): Set<string> {
  const set = new Set<string>();
  if (!state?.columns) return set;

  for (const c of state.columns) {
    if (c.hidden) set.add(c.key);
  }
  return set;
}

/**
 * ✅（可选）提取 order 映射：key -> order
 * - 方便 useColumnPrefs 读取并排序
 */
export function extractColumnOrderMap(
  state: PersistedTableColumnState | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!state?.columns) return map;

  for (const c of state.columns) {
    if (typeof c.order === "number" && Number.isFinite(c.order)) {
      map.set(c.key, c.order);
    }
  }
  return map;
}
