// src/shared/components/table/columnPersist.ts
/**
 * Column Persistence (skeleton)
 *
 * 目的：
 * - 让表格的“列显示/隐藏、列顺序、列宽”等用户偏好可持久化（localStorage）
 * - 与后端无关：这是纯前端体验能力
 *
 * 当前阶段（先搭骨架）：
 * - 定义列状态结构与 key 规则
 * - 提供 load/save 的函数签名与最小实现（可直接用）
 *
 * 说明：
 * - bizKey 建议用“页面唯一标识”（例如 route path 或 menuKey），保证不同页面互不干扰
 * - 这里不和 antd columns 强绑定，保持通用
 */

import { TABLE_COLUMN_PERSIST_PREFIX } from "./constants";

/** 单列的可持久化状态 */
export type PersistedColumnState = {
  key: string;

  /** 是否隐藏（true=隐藏） */
  hidden?: boolean;

  /** 宽度（可选） */
  width?: number;

  /** 排序序号（可选，用于列顺序持久化） */
  order?: number;
};

/** 整个表格的列状态 */
export type PersistedTableColumnState = {
  version: number;
  updatedAt: number;
  columns: PersistedColumnState[];
};

/**
 * 生成列持久化 key
 * @example
 * getColumnPersistKey("rbac_user_list") -> "table-columns:rbac_user_list"
 */
export function getColumnPersistKey(bizKey: string) {
  return `${TABLE_COLUMN_PERSIST_PREFIX}:${bizKey}`;
}

/**
 * 读取列状态
 * - 如果解析失败，返回 null（表示没有持久化或数据损坏）
 */
export function loadColumnState(
  bizKey: string,
): PersistedTableColumnState | null {
  try {
    const key = getColumnPersistKey(bizKey);
    const raw = localStorage.getItem(key);
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
 * - 写入 localStorage
 * - 你后续如果想做“多端同步/后端保存偏好”，也可以把这里替换成请求
 */
export function saveColumnState(
  bizKey: string,
  state: PersistedTableColumnState,
) {
  const key = getColumnPersistKey(bizKey);
  localStorage.setItem(key, JSON.stringify(state));
}

/**
 * 便捷方法：按 columns 数组生成默认 state
 * - 目前只是工具函数占位，后续做列设置 UI 时会用到
 */
export function createDefaultColumnState(
  keys: string[],
): PersistedTableColumnState {
  return {
    version: 1,
    updatedAt: Date.now(),
    columns: keys.map((k, idx) => ({ key: k, hidden: false, order: idx })),
  };
}
