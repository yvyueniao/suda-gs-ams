import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import type { Notify } from "../../../../shared/ui";
import { batchInsertApplyScore } from "../api";
import { searchAllActivities } from "../../../activity-apply/api";

import type {
  BatchInsertApplyScoreItem,
  BatchInsertApplyScorePayload,
} from "../types";

const noopNotify: Notify = () => {};

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
  activityName: string;
  selectedActivityId?: number;
  activityOptions: Array<{ value: string; label: string; id: number }>;
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
  activityName: "",
  selectedActivityId: undefined,
  activityOptions: [],
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

// ===== 核心逻辑保持不变（省略部分） =====

export function useUserApplyScoreImportFlow(options?: { onNotify?: Notify }) {
  const notify = useMemo(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [parsing, setParsing] = useState(false);
  const parsingRef = useRef(false);

  const [loadingActivities, setLoadingActivities] = useState(false);

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

  // ✅ 保留 HEAD：活动选择逻辑
  const setActivityName = useCallback((activityName: string) => {
    setPreview((s) => {
      const matched = s.activityOptions.find((x) => x.value === activityName);
      return {
        ...s,
        activityName,
        selectedActivityId: matched?.id,
      };
    });
  }, []);

  const selectActivity = useCallback((activityName: string) => {
    setPreview((s) => {
      const matched = s.activityOptions.find((x) => x.value === activityName);
      return {
        ...s,
        activityName,
        selectedActivityId: matched?.id,
      };
    });
  }, []);

  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const rows = await searchAllActivities();
      const options = rows.map((x) => ({
        value: normalize(x.name),
        label: `${normalize(x.name)}（ID: ${x.id}）`,
        id: x.id,
      }));
      setPreview((s) => ({ ...s, activityOptions: options }));
    } catch (err) {
      notify({
        kind: "error",
        msg: toErrorMessage(err, "加载活动列表失败"),
      });
    } finally {
      setLoadingActivities(false);
    }
  }, [notify]);

  const submitImport = useCallback(async () => {
    if (submittingRef.current) return;

    // ✅ HEAD逻辑：通过选择的活动
    const activityId = preview.selectedActivityId;
    if (!activityId || activityId <= 0) {
      notify({ kind: "info", msg: "请输入活动名称并从下拉中选择活动" });
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
          data: `提交 ${payload.scoreList.length} 条`,
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
          timestamp: Date.now(),
        },
      });

      notify({ kind: "error", msg });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [closePreview, notify, preview.rows, preview.selectedActivityId]);

  return {
    preview,
    parsing,
    submitting,
    openPreview,
    closePreview,
    submitImport,

    // ✅ HEAD版本导出
    setActivityName,
    selectActivity,
    loadActivities,
    loadingActivities,

    result,
    closeResult,
  };
}
