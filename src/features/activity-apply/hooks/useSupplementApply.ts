// src/features/activity-apply/hooks/useSupplementApply.ts

/**
 * useSupplementApply（无 reason 版本）
 *
 * ✅ 对齐页面层 API：
 * - supplement.modal.open
 * - supplement.submitting
 * - supplement.form.{ activityId, activityName }
 * - supplement.suggestions / supplement.searching
 * - supplement.openSupplement / closeSupplement
 * - supplement.searchByName / pickActivity / setActivityName / setFileList
 * - supplement.submit()
 *
 * ✅ 必传：PDF
 * ❌ 已删除：reason（后端不需要）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "../../../shared/http/error";
import { searchAllActivities, supplementRegisterActivity } from "../api";
import type { ActivityItem } from "../types";

function errToMsg(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}

export type SupplementOption = {
  id: number;
  name: string;
};

export type SupplementModalState = {
  open: boolean;
  keyword: string;
  options: SupplementOption[];
  selected: SupplementOption | null;
  submitting: boolean;
  loadingActivities: boolean;
};

export type UseSupplementApplyOptions = {
  onChanged?: () => void | Promise<void>;
  onNotify?: (payload: {
    kind: "success" | "error" | "info";
    msg: string;
  }) => void;
  debounceMs?: number;
  maxOptions?: number;
};

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function isPdfFile(file: File) {
  const byType = file.type === "application/pdf";
  const byName = file.name.toLowerCase().endsWith(".pdf");
  return byType || byName;
}

function pickFirstFile(fileList: any[]): File | null {
  if (!Array.isArray(fileList) || fileList.length === 0) return null;
  const f = fileList[0];
  const raw = f?.originFileObj ?? f;
  return raw instanceof File ? raw : null;
}

export function useSupplementApply(options: UseSupplementApplyOptions = {}) {
  const { onChanged, onNotify, debounceMs = 300, maxOptions = 10 } = options;

  const [open, setOpen] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<SupplementOption | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [optionsList, setOptionsList] = useState<SupplementOption[]>([]);

  const activitiesRef = useRef<ActivityItem[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  const onChangedRef =
    useRef<UseSupplementApplyOptions["onChanged"]>(onChanged);
  const onNotifyRef = useRef<UseSupplementApplyOptions["onNotify"]>(onNotify);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  // -------------------------
  // open / close
  // -------------------------
  const openSupplement = useCallback(() => {
    setOpen(true);
  }, []);

  const closeSupplement = useCallback(() => {
    setOpen(false);
    setKeyword("");
    setSelected(null);
    setPdfFile(null);
    setOptionsList([]);
  }, []);

  // -------------------------
  // 打开时加载活动列表
  // -------------------------
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoadingActivities(true);
      try {
        const list = await searchAllActivities();
        if (cancelled) return;
        activitiesRef.current = list ?? [];
      } catch (e) {
        if (cancelled) return;
        const msg = errToMsg(e, "加载活动列表失败");
        onNotifyRef.current?.({ kind: "error", msg });
        activitiesRef.current = [];
      } finally {
        if (!cancelled) setLoadingActivities(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // -------------------------
  // 模糊匹配
  // -------------------------
  const runMatch = useCallback(
    (kw: string) => {
      const q = normalize(kw);
      if (!q) {
        setOptionsList([]);
        return;
      }

      const acts = activitiesRef.current || [];
      const matched = acts
        .filter((a) => normalize(a.name).includes(q))
        .slice(0, maxOptions)
        .map((a) => ({ id: a.id, name: a.name }));

      setOptionsList(matched);
    },
    [maxOptions],
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!keyword.trim()) {
      setOptionsList([]);
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      runMatch(keyword);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [keyword, debounceMs, runMatch]);

  // -------------------------
  // 页面层 API
  // -------------------------
  const setActivityName = useCallback((name: string) => {
    setKeyword(name);

    setSelected((prev) => {
      if (!prev) return prev;
      return normalize(prev.name) === normalize(name) ? prev : null;
    });
  }, []);

  const searchByName = useCallback(
    (kw: string) => {
      setActivityName(kw);
    },
    [setActivityName],
  );

  const pickActivity = useCallback((opt: SupplementOption) => {
    setSelected(opt);
    setKeyword(opt.name);
  }, []);

  const setFileList = useCallback((fileList: any[]) => {
    const f = pickFirstFile(fileList);

    if (!f) {
      setPdfFile(null);
      return;
    }

    if (!isPdfFile(f)) {
      setPdfFile(null);
      onNotifyRef.current?.({ kind: "error", msg: "仅支持上传 PDF 文件" });
      return;
    }

    setPdfFile(f);
  }, []);

  const submit = useCallback(async () => {
    const activityId = selected?.id ?? null;

    if (!activityId) {
      onNotifyRef.current?.({
        kind: "error",
        msg: "请先从下拉中选择一个活动/讲座",
      });
      return;
    }

    if (!pdfFile) {
      onNotifyRef.current?.({
        kind: "error",
        msg: "请上传 PDF 附件（必传）",
      });
      return;
    }

    if (!isPdfFile(pdfFile)) {
      onNotifyRef.current?.({
        kind: "error",
        msg: "仅支持上传 PDF 文件",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await supplementRegisterActivity({
        activityId,
        file: pdfFile,
      });

      onNotifyRef.current?.({
        kind: "success",
        msg: (res as any)?.msg ? String((res as any).msg) : "补报名提交成功",
      });

      await Promise.resolve(onChangedRef.current?.());
      closeSupplement();
    } catch (e) {
      const msg = errToMsg(e, "补报名提交失败");
      onNotifyRef.current?.({ kind: "error", msg });
    } finally {
      setSubmitting(false);
    }
  }, [closeSupplement, pdfFile, selected?.id]);

  const modal: SupplementModalState = useMemo(
    () => ({
      open,
      keyword,
      options: optionsList,
      selected,
      submitting,
      loadingActivities,
    }),
    [open, keyword, optionsList, selected, submitting, loadingActivities],
  );

  const form = useMemo(
    () => ({
      activityId: selected?.id ?? null,
      activityName: keyword,
    }),
    [keyword, selected?.id],
  );

  return {
    modal,

    submitting,
    searching: loadingActivities,
    suggestions: optionsList,
    form,

    openSupplement,
    closeSupplement,

    searchByName,
    pickActivity,

    setActivityName,

    setFileList,
    submit,
  };
}
