// src/shared/components/table/exportCsv.ts
/**
 * exportCsv
 *
 * 目标：
 * - 前端把数据导出为 CSV 并触发下载
 * - 支持 BOM（Excel 友好）、自定义列（基于 TableColumnPreset）
 *
 * 依赖：
 * - TableColumnPreset：你 table/types.ts 里已有（key/title/hidden/exportName/...)
 *
 * 用法示例：
 * exportCsv({
 *   filename: "我的活动.csv",
 *   rows,
 *   presets: columnPresets,
 *   visibleKeys, // 可选：只导出当前可见列
 *   mapRow: (row) => ({ ...row, status: statusLabel(row.status) }) // 可选：导出前映射
 * });
 */

import type { TableColumnPreset } from "./types";

export type ExportCsvOptions<T extends object> = {
  filename: string;
  rows: T[];

  /** 列预设：决定导出哪些列、列头叫什么 */
  presets: TableColumnPreset<T>[];

  /**
   * 可选：只导出某些列 key（例如当前列设置的 visibleKeys）
   * - 不传：默认导出 presets 中所有列（不含 hidden=true 的列）
   */
  visibleKeys?: string[];

  /**
   * 可选：导出前对每行做映射（比如把 status 转中文）
   * - 注意：返回对象只需要包含 presets 里用到的字段即可
   */
  mapRow?: (row: T, index: number) => Record<string, any>;

  /** 是否插入 UTF-8 BOM（建议 true，Excel 打开中文不乱码） */
  withBom?: boolean;

  /** 行分隔符（默认 \r\n，Windows/Excel 更友好） */
  newline?: "\n" | "\r\n";
};

function toDisplayString(v: any): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    // 对象/数组：给一个稳定字符串（也可按需改为 ""）
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function escapeCsvCell(s: string): string {
  // CSV 规则：包含逗号/引号/换行需要加双引号；双引号要变成两个双引号
  const needsQuote = /[",\r\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function pickExportPresets<T extends object>(
  presets: TableColumnPreset<T>[],
  visibleKeys?: string[],
): TableColumnPreset<T>[] {
  const base = presets.filter((p) => !p.hidden);

  if (!visibleKeys) return base;

  const set = new Set(visibleKeys);
  // 保持 presets 原顺序
  return base.filter((p) => set.has(p.key));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv<T extends object>(options: ExportCsvOptions<T>) {
  const {
    filename,
    rows,
    presets,
    visibleKeys,
    mapRow,
    withBom = true,
    newline = "\r\n",
  } = options;

  const cols = pickExportPresets(presets, visibleKeys);

  // 表头
  const header = cols.map((c) => escapeCsvCell(c.title)).join(",");

  // 内容
  const lines: string[] = [header];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped = mapRow ? mapRow(raw, i) : (raw as any);

    const line = cols
      .map((c) => {
        const field = (c.exportName ?? c.key) as string;
        const v = (mapped as any)?.[field];
        return escapeCsvCell(toDisplayString(v));
      })
      .join(",");

    lines.push(line);
  }

  const csvText = lines.join(newline);
  const finalText = withBom ? `\uFEFF${csvText}` : csvText;

  const blob = new Blob([finalText], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}
