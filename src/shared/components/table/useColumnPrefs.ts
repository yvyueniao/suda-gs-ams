// src/shared/components/table/useColumnPrefs.ts
/**
 * useColumnPrefs
 *
 * ✅ 新增能力：
 * - orderedKeys：列顺序（仅针对 presets 体系内的列）
 * - setOrderedKeys：更新列顺序并持久化 order
 *
 * ✅ 小体验修复：
 * - 每次 safeSave 后触发内部 tick，让 persistedMap 重新读取一次
 *
 * ✅ 修复（列宽拖拽不生效）：
 * - persisted.width 必须覆盖 rawColumns 的默认 width
 * - 否则 rawColumns 每列都有 width:number，会永远压过 persisted，导致“看起来不能拖”
 *
 * 约定：
 * - visibleKeys：只表示“哪些 presets 列可见”
 * - orderedKeys：表示“presets 列的全量顺序（含隐藏列）”
 */

import { useCallback, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table/interface";
import type { TableColumnPreset } from "./types";
import type {
  PersistedTableColumnState,
  PersistedColumnState,
} from "./columnPersist";
import { loadColumnState, saveColumnState } from "./columnPersist";

export type UseColumnPrefsOptions = {
  version?: number;
};

export type UseColumnPrefsResult<T extends object> = {
  visibleKeys: string[];
  setVisibleKeys: (keys: string[]) => void;

  /** ✅ 新增：列顺序（presets 全量 keys 的顺序，含隐藏列） */
  orderedKeys: string[];
  /** ✅ 新增：设置列顺序（会写入 localStorage.order） */
  setOrderedKeys: (keys: string[]) => void;

  resetToDefault: () => void;

  /**
   * 将 presets 应用到 antd columns
   * - 只过滤 presets 体系内的列
   * - 只对 presets 列应用 persisted width
   * - presets 列按 orderedKeys 排序（含隐藏列，但渲染前会过滤）
   * - 不在 presets 的列（如 actions）保留，并尽量维持其在原 columns 中的位置
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

function pickAllKeys<T extends object>(presets: TableColumnPreset<T>[]) {
  return presets.map((p) => p.key);
}

function toMapByKey(cols?: PersistedColumnState[]) {
  const m = new Map<string, PersistedColumnState>();
  (cols ?? []).forEach((c) => m.set(c.key, c));
  return m;
}

/** ✅ 从 persisted.columns 提取顺序（按 order 排；缺失则置为 Infinity） */
function buildOrderedKeysFromPersisted(
  allKeys: string[],
  persisted: PersistedTableColumnState | null,
) {
  if (!persisted?.columns?.length) return allKeys;

  const map = toMapByKey(persisted.columns);
  const keys = [...allKeys];

  keys.sort((a, b) => {
    const oa = map.get(a)?.order;
    const ob = map.get(b)?.order;
    const na = typeof oa === "number" ? oa : Number.POSITIVE_INFINITY;
    const nb = typeof ob === "number" ? ob : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;

    // 若都没 order（或相等），按 presets 原顺序稳定排序
    return allKeys.indexOf(a) - allKeys.indexOf(b);
  });

  return keys;
}

function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of arr) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
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

  /**
   * ✅ tick：每次写入后 +1，触发“重新读取 persisted”
   * 这样 applyPresetsToAntdColumns 里用到的 persistedMap（width/order/hidden）会立刻刷新
   */
  const [persistTick, setPersistTick] = useState(0);

  // ✅ 读取 persisted：依赖 bizKey + tick
  const persisted = useMemo(() => {
    return safeLoad(bizKey);
  }, [bizKey, persistTick]);

  const persistedMap = useMemo(() => {
    if (!persisted || persisted.version !== version) {
      return new Map<string, PersistedColumnState>();
    }
    return toMapByKey(persisted.columns);
  }, [persisted, version]);

  /** ✅ 1) 初始化顺序：persisted.order > presets 顺序 */
  const [orderedKeys, setOrderedKeysState] = useState<string[]>(() => {
    const p = safeLoad(bizKey);
    if (!p || p.version !== version) return allKeys;
    return buildOrderedKeysFromPersisted(allKeys, p);
  });

  /** ✅ 2) 初始化可见：persisted.hidden > presets.hidden */
  const [visibleKeys, setVisibleKeysState] = useState<string[]>(() => {
    const p = safeLoad(bizKey);
    if (!p || p.version !== version) return defaultVisibleKeys;

    const hidden = new Set<string>();
    (p.columns ?? []).forEach((c) => {
      if (c.hidden) hidden.add(c.key);
    });

    return allKeys.filter((k) => !hidden.has(k));
  });

  /** 将（orderedKeys + visibleKeys + width）写入 persisted */
  const persistState = useCallback(
    (nextOrderedKeys: string[], nextVisibleKeys: string[]) => {
      const orderIndex = new Map<string, number>();
      nextOrderedKeys.forEach((k, idx) => orderIndex.set(k, idx));

      const nextState: PersistedTableColumnState = {
        version,
        updatedAt: Date.now(),
        columns: allKeys.map((k) => ({
          key: k,
          hidden: !nextVisibleKeys.includes(k),
          order: orderIndex.get(k) ?? allKeys.indexOf(k),
          width: persistedMap.get(k)?.width, // 宽度由 resize 写入，这里只保留
        })),
      };

      safeSave(bizKey, nextState);

      // ✅ 写入后立刻触发一次刷新（体验修复）
      setPersistTick((x) => x + 1);
    },
    [allKeys, bizKey, persistedMap, version],
  );

  const setVisibleKeys = useCallback(
    (keys: string[]) => {
      const next = keys.filter((k) => allKeys.includes(k));
      setVisibleKeysState(next);
      persistState(orderedKeys, next);
    },
    [allKeys, orderedKeys, persistState],
  );

  /** ✅ 新增：设置顺序（只影响 order，不改可见） */
  const setOrderedKeys = useCallback(
    (keys: string[]) => {
      const cleaned = uniqKeepOrder(keys.filter((k) => allKeys.includes(k)));
      const rest = allKeys.filter((k) => !cleaned.includes(k));
      const nextOrder = [...cleaned, ...rest];

      setOrderedKeysState(nextOrder);
      persistState(nextOrder, visibleKeys);
    },
    [allKeys, persistState, visibleKeys],
  );

  const resetToDefault = useCallback(() => {
    setOrderedKeysState(allKeys);
    setVisibleKeysState(defaultVisibleKeys);
    persistState(allKeys, defaultVisibleKeys);
  }, [allKeys, defaultVisibleKeys, persistState]);

  const applyPresetsToAntdColumns = useCallback(
    (columns: ColumnsType<T>): ColumnsType<T> => {
      const visibleSet = new Set(visibleKeys);
      const presetKeySet = new Set(allKeys);

      // orderedKeys -> index
      const orderIndex = new Map<string, number>();
      orderedKeys.forEach((k, idx) => orderIndex.set(k, idx));

      const inputCols = (columns ?? []) as any[];

      // 没有任何 presets 列就不处理
      const hasPreset = inputCols.some((col) => {
        const k: unknown = col?.key ?? col?.dataIndex;
        return typeof k === "string" && presetKeySet.has(k);
      });
      if (!hasPreset) return columns;

      // 预先算好“处理后的 presets 列”：width + visible + order
      const presetCols = inputCols
        .filter((col) => {
          const k: unknown = col?.key ?? col?.dataIndex;
          return typeof k === "string" && presetKeySet.has(k);
        })
        .map((col) => {
          const k: string = (col.key ?? col.dataIndex) as any;

          // ✅ 修复：只要 persisted 有 width，就覆盖默认 width（拖拽后的 width 必须生效）
          const p = persistedMap.get(k);
          if (
            typeof p?.width === "number" &&
            Number.isFinite(p.width) &&
            p.width > 0
          ) {
            return { ...col, width: p.width };
          }

          return col;
        })
        .filter((col) => {
          const k: unknown = col?.key ?? col?.dataIndex;
          if (typeof k !== "string") return true;
          return visibleSet.has(k);
        })
        .sort((a, b) => {
          const ka = (a.key ?? a.dataIndex) as string;
          const kb = (b.key ?? b.dataIndex) as string;
          return (orderIndex.get(ka) ?? 1e9) - (orderIndex.get(kb) ?? 1e9);
        });

      /**
       * ✅ 拼回去：保持 extra 列（actions 等）在原 columns 中的位置
       * - 遍历 inputCols
       * - 遇到第一个 presets 列的位置，插入“整段 presetCols”，跳过所有 presets 列
       */
      const out: any[] = [];
      let inserted = false;

      for (let i = 0; i < inputCols.length; i++) {
        const col = inputCols[i];
        const k: unknown = col?.key ?? col?.dataIndex;
        const isPreset = typeof k === "string" && presetKeySet.has(k);

        if (isPreset) {
          if (!inserted) {
            out.push(...presetCols);
            inserted = true;
          }
          continue; // 跳过原来的 presets 列
        }

        out.push(col); // extra 列原样保留
      }

      if (!inserted) out.push(...presetCols);

      return out as ColumnsType<T>;
    },
    [allKeys, orderedKeys, persistedMap, visibleKeys],
  );

  return {
    visibleKeys,
    setVisibleKeys,

    orderedKeys,
    setOrderedKeys,

    resetToDefault,
    applyPresetsToAntdColumns,
  };
}
