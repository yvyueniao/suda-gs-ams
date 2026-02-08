// src/shared/components/table/useResizableColumns.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ColumnsType } from "antd/es/table/interface";
import type { PersistedTableColumnState } from "./columnPersist";
import { loadColumnState, saveColumnState } from "./columnPersist";

const MIN_COL_WIDTH = 80;

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

function extractWidthMap(state: PersistedTableColumnState | null) {
  const map = new Map<string, number>();
  if (!state?.columns) return map;
  for (const c of state.columns) {
    if (
      typeof c.width === "number" &&
      Number.isFinite(c.width) &&
      c.width > 0
    ) {
      map.set(c.key, c.width);
    }
  }
  return map;
}

function upsertWidth(
  prev: PersistedTableColumnState | null,
  colKey: string,
  nextWidth: number,
): PersistedTableColumnState {
  const base: PersistedTableColumnState =
    prev ?? ({ version: 1, updatedAt: Date.now(), columns: [] } as any);

  const cols = Array.isArray(base.columns) ? [...base.columns] : [];
  const idx = cols.findIndex((c) => c.key === colKey);

  if (idx >= 0) cols[idx] = { ...cols[idx], width: nextWidth };
  else cols.push({ key: colKey, width: nextWidth });

  return { ...base, updatedAt: Date.now(), columns: cols };
}

function getColKey(col: any): string | undefined {
  if (typeof col?.key === "string") return col.key;
  if (typeof col?.dataIndex === "string") return col.dataIndex;
  return undefined;
}

export type UseResizableColumnsOptions<T extends object> = {
  bizKey?: string;
  columns: ColumnsType<T>;
  enabled?: boolean;
  minWidth?: number;
};

export type UseResizableColumnsResult<T extends object> = {
  columns: ColumnsType<T>;
  components?: any;
};

/**
 * useResizableColumns（pointer 方案）
 *
 * ✅ 修复点：
 * - 不再给 <th> 写 position（否则会破坏 fixed="right" 的 sticky）
 * - 用 th 内部 wrapper（position:relative）承载拖拽条
 */
export function useResizableColumns<T extends object>(
  options: UseResizableColumnsOptions<T>,
): UseResizableColumnsResult<T> {
  const {
    bizKey,
    columns,
    enabled = false,
    minWidth = MIN_COL_WIDTH,
  } = options;

  /** 1) persisted width */
  const persistedWidthMap = useMemo(() => {
    if (!enabled || !bizKey) return new Map<string, number>();
    return extractWidthMap(safeLoad(bizKey));
  }, [bizKey, enabled]);

  /** 2) widthState */
  const [widthState, setWidthState] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled || !bizKey) return;

    setWidthState((prev) => {
      const next = { ...prev };

      (columns ?? []).forEach((col: any) => {
        const colKey = getColKey(col);
        if (!colKey) return;

        const p = persistedWidthMap.get(colKey);
        if (typeof p === "number") {
          next[colKey] = p;
          return;
        }

        if (
          typeof col.width === "number" &&
          Number.isFinite(col.width) &&
          col.width > 0
        ) {
          if (typeof next[colKey] !== "number") next[colKey] = col.width;
        }
      });

      return next;
    });
  }, [bizKey, columns, enabled, persistedWidthMap]);

  /** 3) persist */
  const persistWidth = useCallback(
    (colKey: string, nextWidthRaw: number) => {
      if (!enabled || !bizKey) return;
      const nextWidth = Math.max(minWidth, Math.floor(nextWidthRaw || 0));
      const prev = safeLoad(bizKey);
      safeSave(bizKey, upsertWidth(prev, colKey, nextWidth));
    },
    [bizKey, enabled, minWidth],
  );

  /** 4) merge columns */
  const mergedColumns: ColumnsType<T> = useMemo(() => {
    if (!enabled || !bizKey) return columns;

    return (columns ?? []).map((col: any) => {
      const colKey = getColKey(col);
      if (!colKey) return col;

      const w = widthState[colKey];
      const width =
        typeof w === "number" && Number.isFinite(w) && w > 0 ? w : col.width;

      const originOnHeaderCell = col.onHeaderCell;

      return {
        ...col,
        width,
        onHeaderCell: (...args: any[]) => {
          const origin = originOnHeaderCell?.(...args) ?? {};
          return {
            ...origin,
            "data-col-key": colKey,
            // 只补 width，不去动 position（fixed header 要靠 antd 自己的 sticky）
            style: { ...(origin.style ?? {}), ...(width ? { width } : {}) },
          };
        },
      };
    }) as ColumnsType<T>;
  }, [bizKey, columns, enabled, widthState]);

  /** 5) pointer drag */
  const dragRef = useRef<{
    dragging: boolean;
    colKey?: string;
    startX: number;
    startW: number;
  }>({ dragging: false, startX: 0, startW: 0 });

  const components = useMemo(() => {
    if (!enabled || !bizKey) return undefined;

    return {
      header: {
        cell: (cellProps: any) => {
          const { children, style, ...rest } = cellProps;
          const colKey = rest?.["data-col-key"] as string | undefined;

          const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
            if (!colKey) return;

            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);

            const th = e.currentTarget.closest("th") as HTMLElement | null;
            if (!th) return;

            const startW =
              widthState[colKey] ??
              Math.floor(th.getBoundingClientRect().width || 0);

            dragRef.current.dragging = true;
            dragRef.current.colKey = colKey;
            dragRef.current.startX = e.clientX;
            dragRef.current.startW = startW;

            const onMove = (ev: PointerEvent) => {
              if (!dragRef.current.dragging) return;
              const dx = ev.clientX - dragRef.current.startX;
              const nextW = Math.max(minWidth, dragRef.current.startW + dx);

              setWidthState((prev) => ({
                ...prev,
                [colKey]: Math.floor(nextW),
              }));
            };

            const onUp = (ev: PointerEvent) => {
              if (!dragRef.current.dragging) return;
              dragRef.current.dragging = false;

              const dx = ev.clientX - dragRef.current.startX;
              const nextW = Math.max(minWidth, dragRef.current.startW + dx);

              persistWidth(colKey, nextW);

              window.removeEventListener("pointermove", onMove, true);
              window.removeEventListener("pointerup", onUp, true);
            };

            window.addEventListener("pointermove", onMove, true);
            window.addEventListener("pointerup", onUp, true);
          };

          return (
            <th
              {...rest}
              style={{
                ...style,
                userSelect: "none",
                // ✅ 关键：这里不要设置 position（fixed header 要 sticky）
              }}
            >
              {/* ✅ 用 wrapper 做 relative，拖拽条挂在 wrapper 上 */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
              >
                {children}

                <div
                  onPointerDown={onPointerDown}
                  style={{
                    position: "absolute",
                    right: -6,
                    top: 0,
                    height: "100%",
                    width: 12,
                    cursor: "col-resize",
                    touchAction: "none",
                    zIndex: 10,
                  }}
                />
              </div>
            </th>
          );
        },
      },
    };
  }, [bizKey, enabled, minWidth, persistWidth, widthState]);

  return { columns: mergedColumns, components };
}
