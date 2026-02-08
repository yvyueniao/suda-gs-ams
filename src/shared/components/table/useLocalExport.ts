// src/shared/components/table/useLocalExport.ts
/**
 * useLocalExport
 *
 * 适用场景（你们当前系统的核心前提）：
 * - 后端返回全量 rows
 * - 导出也直接基于前端当前“过滤后的全量数据”（filtered）
 *
 * 作用：
 * - 接受 rows + presets + visibleKeys
 * - 内部直接调用 exportCsv
 * - 统一处理：
 *   - 文件名（默认：${filenameBase}-${yyyyMMdd-HHmm}.csv）
 *   - mapRow（可选）
 *   - 提示信息（可选：成功/失败/空数据）
 *
 * 说明：
 * - 你们可以保留 useTableExport（未来后端分页再用）
 * - 但当前页面推荐：applyLocalQuery(...).filtered -> useLocalExport.exportCsv()
 */

import { useCallback, useMemo, useState } from "react";
import type { TableColumnPreset } from "./types";
import { exportCsv } from "./exportCsv";

export type UseLocalExportOptions<T extends object> = {
  /**
   * 文件名基础名（不含扩展名）
   * - 例如 "我的活动" -> "我的活动-20260208-1930.csv"
   */
  filenameBase?: string;

  /**
   * 自定义最终文件名
   * - 优先级高于 filenameBase
   */
  filename?: string;

  /**
   * 仅导出当前可见列（通常传 visibleKeys）
   * - 不传则导出 presets 中所有非 hidden 列
   */
  visibleKeys?: string[];

  /**
   * 导出前对每行做映射（例如把枚举转中文、拼接字段）
   * - 返回对象只需包含 presets 用到的字段即可
   */
  mapRow?: (row: T, index: number) => Record<string, any>;

  /**
   * 是否插入 UTF-8 BOM（Excel 中文不乱码）
   * - 默认 true
   */
  withBom?: boolean;

  /**
   * 空数据是否仍然导出（仅表头）
   * - 默认 false：会提示“暂无可导出数据”
   */
  allowEmpty?: boolean;

  /**
   * 提示函数（可选）
   * - 不传则静默（不依赖 antd message，保持 shared 解耦）
   */
  notify?: (type: "success" | "error" | "info", text: string) => void;
};

export type UseLocalExportState = {
  exporting: boolean;
  error: unknown | null;
};

export type UseLocalExportResult<T extends object> = UseLocalExportState & {
  exportCsv: (override?: UseLocalExportOptions<T>) => void;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTimestamp(d: Date) {
  // yyyyMMdd-HHmm
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}${MM}${dd}-${HH}${mm}`;
}

function withCsvExt(name: string) {
  const n = (name ?? "").trim();
  if (!n) return `export-${formatTimestamp(new Date())}.csv`;
  return n.toLowerCase().endsWith(".csv") ? n : `${n}.csv`;
}

/**
 * useLocalExport
 *
 * @param rows - 要导出的“全量数据”（建议传 applyLocalQuery(...).filtered）
 * @param presets - 列预设
 * @param visibleKeys - 当前可见列（可选）
 * @param options - 默认导出配置（可选）
 */
export function useLocalExport<T extends object>(
  rows: T[],
  presets: TableColumnPreset<T>[],
  visibleKeys?: string[],
  options?: UseLocalExportOptions<T>,
): UseLocalExportResult<T> {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const baseOptions = useMemo<UseLocalExportOptions<T>>(() => {
    return {
      visibleKeys,
      withBom: true,
      allowEmpty: false,
      ...(options ?? {}),
    };
  }, [options, visibleKeys]);

  const doNotify = useCallback(
    (type: "success" | "error" | "info", text: string) => {
      baseOptions.notify?.(type, text);
    },
    [baseOptions],
  );

  const exportCsvFn = useCallback(
    (override?: UseLocalExportOptions<T>) => {
      if (exporting) return;

      const opt: UseLocalExportOptions<T> = {
        ...baseOptions,
        ...(override ?? {}),
      };

      const data = Array.isArray(rows) ? rows : [];
      const cols = Array.isArray(presets) ? presets : [];

      if (!cols.length) {
        doNotify("error", "导出失败：未配置导出列（presets 为空）");
        return;
      }

      if (!data.length && !opt.allowEmpty) {
        doNotify("info", "暂无可导出数据");
        return;
      }

      const ts = formatTimestamp(new Date());
      const fallbackBase = opt.filenameBase?.trim() || "export";
      const finalFilename = withCsvExt(opt.filename || `${fallbackBase}-${ts}`);

      try {
        setExporting(true);
        setError(null);

        exportCsv<T>({
          filename: finalFilename,
          rows: data,
          presets: cols,
          visibleKeys: opt.visibleKeys,
          mapRow: opt.mapRow,
          withBom: opt.withBom ?? true,
        });

        doNotify("success", `已导出：${finalFilename}`);
      } catch (e) {
        setError(e);
        doNotify("error", "导出失败，请稍后重试");
      } finally {
        setExporting(false);
      }
    },
    [baseOptions, doNotify, exporting, presets, rows],
  );

  return {
    exporting,
    error,
    exportCsv: exportCsvFn,
  };
}
