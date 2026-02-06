// src/shared/components/table/useResizableColumns.tsx
import React, { useCallback, useMemo, useRef } from "react";
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
    if (typeof c.width === "number" && c.width > 0) map.set(c.key, c.width);
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

export function useResizableColumns<T extends object>(
  options: UseResizableColumnsOptions<T>,
): UseResizableColumnsResult<T> {
  const {
    bizKey,
    columns,
    enabled = false,
    minWidth = MIN_COL_WIDTH,
  } = options;

  const widthMap = useMemo(() => {
    if (!enabled || !bizKey) return new Map<string, number>();
    return extractWidthMap(safeLoad(bizKey));
  }, [bizKey, enabled]);

  const persistWidth = useCallback(
    (colKey: string, nextWidthRaw: number) => {
      if (!enabled || !bizKey) return;
      const nextWidth = Math.max(minWidth, Math.floor(nextWidthRaw || 0));
      const prev = safeLoad(bizKey);
      safeSave(bizKey, upsertWidth(prev, colKey, nextWidth));
    },
    [bizKey, enabled, minWidth],
  );

  const mergedColumns = useMemo(() => {
    if (!enabled || !bizKey) return columns;

    return (columns ?? []).map((col: any) => {
      const colKey: string | undefined =
        typeof col?.key === "string"
          ? col.key
          : typeof col?.dataIndex === "string"
            ? col.dataIndex
            : undefined;

      if (!colKey) return col;

      const persistedWidth = widthMap.get(colKey);
      const width =
        typeof col.width === "number"
          ? col.width
          : typeof persistedWidth === "number"
            ? persistedWidth
            : undefined;

      return {
        ...col,
        width,
        onHeaderCell: () => ({
          "data-col-key": colKey,
          // 这里给 width，不要动 position（fixed 列头依赖 antd 的 sticky）
          style: width ? { width } : undefined,
        }),
      };
    }) as ColumnsType<T>;
  }, [bizKey, columns, enabled, widthMap]);

  // ✅ 拖拽状态：hook 顶层 ref（不要写到 cell 里）
  const dragRef = useRef<{
    dragging: boolean;
    colKey?: string;
    startX: number;
    startW: number;
    th?: HTMLElement | null;
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

            // ✅ 捕获指针：避免拖动中“丢事件”
            e.currentTarget.setPointerCapture?.(e.pointerId);

            const th = e.currentTarget.closest("th") as HTMLElement | null;
            if (!th) return;

            dragRef.current.dragging = true;
            dragRef.current.colKey = colKey;
            dragRef.current.startX = e.clientX;
            dragRef.current.startW = th.getBoundingClientRect().width;
            dragRef.current.th = th;

            const onMove = (ev: PointerEvent) => {
              if (!dragRef.current.dragging) return;
              const dx = ev.clientX - dragRef.current.startX;
              const nextW = Math.max(minWidth, dragRef.current.startW + dx);
              if (dragRef.current.th) {
                dragRef.current.th.style.width = `${nextW}px`;
              }
            };

            const onUp = (ev: PointerEvent) => {
              if (!dragRef.current.dragging) return;
              dragRef.current.dragging = false;

              const dx = ev.clientX - dragRef.current.startX;
              const nextW = Math.max(minWidth, dragRef.current.startW + dx);

              if (dragRef.current.colKey) {
                persistWidth(dragRef.current.colKey, nextW);
              }

              window.removeEventListener("pointermove", onMove, true);
              window.removeEventListener("pointerup", onUp, true);
            };

            // ✅ capture=true，优先拿到事件（不被 Table 内部逻辑吞）
            window.addEventListener("pointermove", onMove, true);
            window.addEventListener("pointerup", onUp, true);
          };

          return (
            <th
              {...rest}
              // ✅ 关键：不要覆盖 position，否则 fixed 列头的 sticky 会失效
              style={{
                ...style,
                userSelect: "none",
              }}
            >
              {/* ✅ 内部 wrapper 用 relative，给拖拽条定位，不影响 th 的 sticky */}
              <div
                style={{ position: "relative", height: "100%", width: "100%" }}
              >
                {children}
                <div
                  onPointerDown={onPointerDown}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: "100%",
                    width: 10,
                    cursor: "col-resize",
                    touchAction: "none",
                    zIndex: 10,
                    pointerEvents: "auto",
                  }}
                />
              </div>
            </th>
          );
        },
      },
    };
  }, [bizKey, enabled, minWidth, persistWidth]);

  return { columns: mergedColumns, components };
}
