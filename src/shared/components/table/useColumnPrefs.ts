// src/shared/components/table/useColumnPrefs.ts
/**
 * useColumnPrefs
 *
 * 职责：
 * - 将“列预设（TableColumnPreset） + 持久化状态（localStorage）”合成最终可用的列配置
 * - 提供：
 *   1) visibleKeys（当前可见列 key 列表）
 *   2) applyPresetsToAntdColumns：把 preset + 可见/宽度应用到 antd columns
 *   3) setVisibleKeys / resetToDefault：更新并持久化
 *
 * 设计说明：
 * - 不强依赖业务（bizKey 用 route/menuKey 等唯一标识）
 * - 默认隐藏来自 presets.hidden
 * - 持久化优先级：persisted > presets 默认
 * - “列顺序/宽度”先支持最小可用：宽度从 persisted 读取，顺序先按 presets 顺序（后续可扩展）
 */

import { useCallback, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table/interface";
import type { TableColumnPreset } from "./types";
import type {
  PersistedTableColumnState,
  PersistedColumnState,
} from "./columnPersist";
import {
  createDefaultColumnState,
  loadColumnState,
  saveColumnState,
} from "./columnPersist";

export type UseColumnPrefsOptions = {
  /**
   * 持久化版本号：
   * - 当你改了列 key/结构，想让旧配置失效时 bump
   */
  version?: number;
};

export type UseColumnPrefsResult<T extends object> = {
  /** 当前可见列 keys（用于 ColumnSettings / 业务层过滤等） */
  visibleKeys: string[];

  /** 直接设置可见列（会写入 localStorage） */
  setVisibleKeys: (keys: string[]) => void;

  /** 恢复默认（回到 presets.hidden 的默认规则） */
  resetToDefault: () => void;

  /**
   * 将 presets 应用到 antd columns
   * - 会根据 visibleKeys 过滤
   * - 会根据 persisted width 赋值（若 antd column 未显式写 width）
   */
  applyPresetsToAntdColumns: (columns: ColumnsType<T>) => ColumnsType<T>;
};

function safeLoad(bizKey: string): PersistedTableColumnState | null {
  try {
    if (typeof window === "undefined") return null;
    return loadColumnState(bizKey);
  } catch {
    return null;
  }
}

function safeSave(bizKey: string, state: PersistedTableColumnState) {
  try {
    if (typeof window === "undefined") return;
    saveColumnState(bizKey, state);
  } catch {
    // ignore
  }
}

function buildDefaultVisibleKeys<T extends object>(
  presets: TableColumnPreset<T>[],
) {
  return presets.filter((p) => !p.hidden).map((p) => p.key);
}

function toMapByKey(cols?: PersistedColumnState[]) {
  const m = new Map<string, PersistedColumnState>();
  (cols ?? []).forEach((c) => m.set(c.key, c));
  return m;
}

function pickAllKeys<T extends object>(presets: TableColumnPreset<T>[]) {
  return presets.map((p) => p.key);
}

export function useColumnPrefs<T extends object>(
  bizKey: string,
  presets: TableColumnPreset<T>[],
  options?: UseColumnPrefsOptions,
): UseColumnPrefsResult<T> {
  const version = options?.version ?? 1;

  const allKeys = useMemo(() => pickAllKeys(presets), [presets]);
  const defaultVisibleKeys = useMemo(
    () => buildDefaultVisibleKeys(presets),
    [presets],
  );

  // 初始化：优先从 persisted 读，否则用 defaultVisibleKeys
  const [visibleKeys, setVisibleKeysState] = useState<string[]>(() => {
    const persisted = safeLoad(bizKey);
    if (!persisted || persisted.version !== version) return defaultVisibleKeys;

    const hidden = new Set<string>();
    persisted.columns.forEach((c) => {
      if (c.hidden) hidden.add(c.key);
    });

    // 只保留当前 presets 存在的 key
    return allKeys.filter((k) => !hidden.has(k));
  });

  // 取一份“当前持久化列状态”映射（用于宽度等信息）
  const persistedMap = useMemo(() => {
    const persisted = safeLoad(bizKey);
    if (!persisted || persisted.version !== version)
      return new Map<string, PersistedColumnState>();
    return toMapByKey(persisted.columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizKey, version]); // 注意：这里不会随 visibleKeys 自动更新（足够用；后续可加事件触发刷新）

  const persistVisibleKeys = useCallback(
    (nextVisibleKeys: string[]) => {
      // 保存成 “hidden”为主的结构：没在 visibleKeys 里就是 hidden
      const nextState: PersistedTableColumnState = {
        version,
        updatedAt: Date.now(),
        columns: allKeys.map((k, idx) => ({
          key: k,
          hidden: !nextVisibleKeys.includes(k),
          order: idx, // 先占位：目前按 presets 顺序
          // width：不在这里写（宽度由 resize 逻辑写入）
          width: persistedMap.get(k)?.width,
        })),
      };

      safeSave(bizKey, nextState);
    },
    [allKeys, bizKey, persistedMap, version],
  );

  const setVisibleKeys = useCallback(
    (keys: string[]) => {
      // 只保留当前存在的 keys（防止外部传入非法 key）
      const next = keys.filter((k) => allKeys.includes(k));
      setVisibleKeysState(next);
      persistVisibleKeys(next);
    },
    [allKeys, persistVisibleKeys],
  );

  const resetToDefault = useCallback(() => {
    setVisibleKeysState(defaultVisibleKeys);

    // 恢复默认：直接覆盖 persisted（同时保留已存在的 width）
    const state: PersistedTableColumnState = {
      version,
      updatedAt: Date.now(),
      columns: allKeys.map((k, idx) => ({
        key: k,
        hidden: !defaultVisibleKeys.includes(k),
        order: idx,
        width: persistedMap.get(k)?.width,
      })),
    };
    safeSave(bizKey, state);
  }, [allKeys, bizKey, defaultVisibleKeys, persistedMap, version]);

  const applyPresetsToAntdColumns = useCallback(
    (columns: ColumnsType<T>): ColumnsType<T> => {
      // 1) 按 visibleKeys 过滤（用 column.key 作为主键；没有 key 则尝试 dataIndex）
      const visibleSet = new Set(visibleKeys);

      const filtered = (columns ?? []).filter((col: any) => {
        const k: unknown = col?.key ?? col?.dataIndex;
        if (typeof k === "string") return visibleSet.has(k);
        // dataIndex 可能是 string[]，这里不强做映射，避免误伤
        return true;
      });

      // 2) 把 persisted width 应用到列（只在 col.width 未显式指定时）
      const withWidth = filtered.map((col: any) => {
        const k: unknown = col?.key ?? col?.dataIndex;
        const keyStr = typeof k === "string" ? k : undefined;
        if (!keyStr) return col;

        const persisted = persistedMap.get(keyStr);
        if (!persisted?.width) return col;
        if (typeof col.width === "number") return col;

        return { ...col, width: persisted.width };
      });

      return withWidth as ColumnsType<T>;
    },
    [persistedMap, visibleKeys],
  );

  return {
    visibleKeys,
    setVisibleKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  };
}
