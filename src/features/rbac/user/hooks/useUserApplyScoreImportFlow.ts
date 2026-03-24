import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import type { Notify } from "../../../../shared/ui";
import { batchInsertApplyScore } from "../api";
import type {
  BatchInsertApplyScoreItem,
  BatchInsertApplyScorePayload,
} from "../types";

const noopNotify: Notify = () => {
  // noop
};

type PreviewRow = {
  rowNo: number;
  username: string;
  scoreRaw: string;
  score?: number;
  errors: string[];
  duplicate: boolean;
  canSubmit: boolean;
};

type PreviewStats = {
  total: number;
  validCount: number;
  submitCount: number;
  invalidCount: number;
  duplicateCount: number;
  emptyCount: number;
  invalidUsernameCount: number;
  invalidScoreCount: number;
};

type PreviewState = {
  open: boolean;
  fileName?: string;
  activityIdText: string;
  rows: PreviewRow[];
  stats: PreviewStats;
};

type ResultState = {
  open: boolean;
  result?: {
    code?: number;
    msg?: string;
    data?: unknown;
    timestamp?: number;
  };
};

const EMPTY_STATS: PreviewStats = {
  total: 0,
  validCount: 0,
  submitCount: 0,
  invalidCount: 0,
  duplicateCount: 0,
  emptyCount: 0,
  invalidUsernameCount: 0,
  invalidScoreCount: 0,
};

const EMPTY_PREVIEW: PreviewState = {
  open: false,
  activityIdText: "",
  rows: [],
  stats: EMPTY_STATS,
};

function normalize(v: unknown): string {
  return String(v ?? "").trim();
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String(err.message ?? "").trim();
    if (msg) return msg;
  }
  return fallback;
}

function toNumberOrNull(v: string): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseRows(jsonRows: Record<string, unknown>[]): PreviewRow[] {
  if (!Array.isArray(jsonRows) || jsonRows.length === 0) return [];

  const headers = Object.keys(jsonRows[0] ?? {});
  const lowerMap = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));
  const usernameKey = lowerMap.get("username") ?? "username";
  const scoreKey = lowerMap.get("score") ?? "score";

  const baseRows = jsonRows
    .map((raw, idx) => {
      const username = normalize(raw[usernameKey]);
      const scoreRaw = normalize(raw[scoreKey]);
      const errors: string[] = [];

      if (!username || !scoreRaw) {
        errors.push("学号或分数为空");
      }
      if (username && !/^\d{11}$/.test(username)) {
        errors.push("学号必须是11位数字");
      }

      const scoreNum = toNumberOrNull(scoreRaw);
      if (scoreRaw && scoreNum === null) {
        errors.push("分数必须是数字");
      }

      return {
        rowNo: idx + 2,
        username,
        scoreRaw,
        score: scoreNum ?? undefined,
        errors,
        duplicate: false,
        canSubmit: false,
      } satisfies PreviewRow;
    })
    .filter((r) => r.username || r.scoreRaw);

  const seen = new Set<string>();
  const dupSet = new Set<string>();
  baseRows.forEach((r) => {
    if (!r.username) return;
    if (seen.has(r.username)) dupSet.add(r.username);
    seen.add(r.username);
  });

  return baseRows.map((r) => {
    const duplicate = !!r.username && dupSet.has(r.username);
    const errors = duplicate ? [...r.errors, "重复学号（提交时自动跳过）"] : r.errors;
    return {
      ...r,
      duplicate,
      errors,
      canSubmit: errors.length === 0 && !duplicate && r.score !== undefined,
    };
  });
}

function buildStats(rows: PreviewRow[]): PreviewStats {
  let emptyCount = 0;
  let invalidUsernameCount = 0;
  let invalidScoreCount = 0;
  let duplicateCount = 0;

  rows.forEach((r) => {
    if (r.errors.some((e) => e.includes("为空"))) emptyCount += 1;
    if (r.errors.some((e) => e.includes("11位数字"))) invalidUsernameCount += 1;
    if (r.errors.some((e) => e.includes("分数必须是数字"))) invalidScoreCount += 1;
    if (r.duplicate) duplicateCount += 1;
  });

  const submitCount = rows.filter((r) => r.canSubmit).length;
  const invalidCount = rows.length - submitCount;

  return {
    total: rows.length,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    submitCount,
    invalidCount,
    duplicateCount,
    emptyCount,
    invalidUsernameCount,
    invalidScoreCount,
  };
}

function toPayload(activityId: number, rows: PreviewRow[]): BatchInsertApplyScorePayload {
  const scoreList: BatchInsertApplyScoreItem[] = rows
    .filter((r) => r.canSubmit && r.score !== undefined)
    .map((r) => ({ username: r.username, score: r.score as number }));

  return { activityId, scoreList };
}

export function useUserApplyScoreImportFlow(options?: { onNotify?: Notify }) {
  const notify = useMemo(() => options?.onNotify ?? noopNotify, [options?.onNotify]);

  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [parsing, setParsing] = useState(false);
  const parsingRef = useRef(false);

  const [result, setResult] = useState<ResultState>({ open: false });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const openPreview = useCallback(() => {
    setPreview({ ...EMPTY_PREVIEW, open: true });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(EMPTY_PREVIEW);
  }, []);

  const closeResult = useCallback(() => {
    setResult({ open: false, result: undefined });
  }, []);

  const setActivityIdText = useCallback((activityIdText: string) => {
    setPreview((s) => ({ ...s, activityIdText }));
  }, []);

  const parseFile = useCallback(
    async (file: File) => {
      if (!file || parsingRef.current) return;

      if (!/\.(xlsx|xls)$/i.test(file.name ?? "")) {
        notify({ kind: "error", msg: "请上传 xls/xlsx 文件" });
        return;
      }

      parsingRef.current = true;
      setParsing(true);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const firstSheetName = wb.SheetNames?.[0];
        if (!firstSheetName) {
          notify({ kind: "error", msg: "未找到工作表（sheet）" });
          return;
        }

        const ws = wb.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const rows = parseRows(json);
        const stats = buildStats(rows);

        setPreview((s) => ({
          ...s,
          open: true,
          fileName: file.name,
          rows,
          stats,
        }));

        if (stats.duplicateCount > 0) {
          notify({
            kind: "info",
            msg: `检测到 ${stats.duplicateCount} 行重复学号，提交时会自动跳过`,
          });
        }
      } catch (err) {
        notify({
          kind: "error",
          msg: toErrorMessage(err, "解析失败，请检查模板是否正确"),
        });
      } finally {
        parsingRef.current = false;
        setParsing(false);
      }
    },
    [notify],
  );

  const submitImport = useCallback(async () => {
    if (submittingRef.current) return;

    const activityId = Number(preview.activityIdText);
    if (!Number.isFinite(activityId) || activityId <= 0) {
      notify({ kind: "info", msg: "请输入正确的活动ID" });
      return;
    }

    const payload = toPayload(activityId, preview.rows);
    if (payload.scoreList.length === 0) {
      notify({ kind: "info", msg: "没有可提交的数据，请先修正文件内容" });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const data = await batchInsertApplyScore(payload);
      const msg = normalize(data) || "操作成功";

      setResult({
        open: true,
        result: {
          code: 200,
          msg,
          data: `提交 ${payload.scoreList.length} 条，解析总计 ${preview.stats.total} 条`,
          timestamp: Date.now(),
        },
      });
      notify({ kind: "success", msg });
      closePreview();
    } catch (err) {
      const msg = toErrorMessage(err, "导入失败");
      setResult({
        open: true,
        result: {
          code: 500,
          msg,
          data: `提交失败（可提交数据 ${payload.scoreList.length} 条）`,
          timestamp: Date.now(),
        },
      });
      notify({ kind: "error", msg });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [closePreview, notify, preview.activityIdText, preview.rows, preview.stats.total]);

  return {
    preview,
    parsing,
    submitting,
    openPreview,
    closePreview,
    parseFile,
    submitImport,
    setActivityIdText,
    result,
    closeResult,
  };
}
