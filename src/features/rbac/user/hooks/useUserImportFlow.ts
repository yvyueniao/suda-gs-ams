// src/features/rbac/user/hooks/useUserImportFlow.ts

import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import type { Notify } from "../../../../shared/ui";
import type { UserCreatePayload, UserImportPreviewRow } from "../types";
import { batchInsertUser } from "../api";

/** ✅ 稳定 noop，避免 callback 抖动 */
const noopNotify: Notify = () => {
  // noop
};

type ImportPreviewStats = {
  total: number;
  emptyRequiredCount: number;
  duplicateUsernameCount: number;
};

type ImportPreviewState = {
  open: boolean;
  fileName?: string;
  rows: UserImportPreviewRow[];
  stats: ImportPreviewStats;
  /** 可选：把“有问题的行”给 UI 标红 */
  invalidRowIndexes: number[];
};

/**
 * ✅ 后端统一返回壳（你们接口文档口径）
 * { code, msg, data, timestamp }
 *
 * 这里把 result 统一存成这个壳，页面层 ImportResultModal 也正好吃这个结构
 */
export type ApiShellResult = {
  code?: number;
  msg?: string;
  data?: unknown;
  timestamp?: number;
};

type ImportResultState = {
  open: boolean;
  result?: ApiShellResult;
};

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

/** ✅ 提示信息优先用后端 msg：ApiError.message / Error.message */
function errToMsg(err: unknown, fallback: string) {
  const anyErr = err as any;
  const msg = typeof anyErr?.message === "string" ? anyErr.message.trim() : "";
  return msg || fallback;
}

function pickFirstMatch(
  headers: string[],
  candidates: string[],
): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return headers[idx];
  }
  return null;
}

/**
 * ✅ 解析规则（按你说的“模板固定中文表头”）
 * - username: 学号
 * - password: 密码
 * - name: 姓名
 * - email: 邮箱
 * - major: 专业
 * - grade: 年级
 *
 * 兼容：若有人把表头稍微写成“邮箱地址/学号/姓名”等，也能尽量识别
 */
function mapSheetRowsToPreview(
  jsonRows: Record<string, any>[],
): UserImportPreviewRow[] {
  if (!Array.isArray(jsonRows) || jsonRows.length === 0) return [];

  const headers = Object.keys(jsonRows[0] ?? {});
  const hUsername =
    pickFirstMatch(headers, ["学号", "用户名", "账号", "username"]) ?? "学号";
  const hPassword = pickFirstMatch(headers, ["密码", "password"]) ?? "密码";
  const hName = pickFirstMatch(headers, ["姓名", "name"]) ?? "姓名";
  const hEmail =
    pickFirstMatch(headers, ["邮箱", "邮箱地址", "email"]) ?? "邮箱";
  const hMajor = pickFirstMatch(headers, ["专业", "major"]) ?? "专业";
  const hGrade = pickFirstMatch(headers, ["年级", "grade"]) ?? "年级";

  return (
    jsonRows
      .map((r) => ({
        username: normalizeText(r[hUsername]),
        password: normalizeText(r[hPassword]),
        name: normalizeText(r[hName]),
        email: normalizeText(r[hEmail]),
        major: normalizeText(r[hMajor]),
        grade: normalizeText(r[hGrade]),
      }))
      // 去掉全空行（xlsx 里很常见）
      .filter((x) => {
        const values = [
          x.username,
          x.password,
          x.name,
          x.email,
          x.major,
          x.grade,
        ];
        return values.some((v) => v.length > 0);
      })
  );
}

function buildStats(rows: UserImportPreviewRow[]): {
  stats: ImportPreviewStats;
  invalidRowIndexes: number[];
} {
  const invalidRowIndexes: number[] = [];

  // 必填：你后端创建用户需要这 6 个
  const requiredKeys: (keyof UserImportPreviewRow)[] = [
    "username",
    "password",
    "name",
    "email",
    "major",
    "grade",
  ];

  let emptyRequiredCount = 0;

  rows.forEach((r, idx) => {
    const hasEmpty = requiredKeys.some((k) => !normalizeText(r[k]));
    if (hasEmpty) {
      emptyRequiredCount += 1;
      invalidRowIndexes.push(idx);
    }
  });

  // 重复 username
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const u = normalizeText(r.username);
    if (!u) continue;
    if (seen.has(u)) dup.add(u);
    else seen.add(u);
  }
  const duplicateUsernameCount = dup.size;

  // 也把重复行标红（可选，体验更好）
  if (duplicateUsernameCount > 0) {
    rows.forEach((r, idx) => {
      const u = normalizeText(r.username);
      if (u && dup.has(u) && !invalidRowIndexes.includes(idx)) {
        invalidRowIndexes.push(idx);
      }
    });
  }

  return {
    stats: {
      total: rows.length,
      emptyRequiredCount,
      duplicateUsernameCount,
    },
    invalidRowIndexes: invalidRowIndexes.sort((a, b) => a - b),
  };
}

function previewToPayload(rows: UserImportPreviewRow[]): UserCreatePayload[] {
  return rows.map((r) => ({
    username: normalizeText(r.username),
    password: normalizeText(r.password), // ✅ 你确认：password 不加密
    name: normalizeText(r.name),
    email: normalizeText(r.email),
    major: normalizeText(r.major),
    grade: normalizeText(r.grade),
  }));
}

function toShellResult(x: unknown): ApiShellResult {
  // ✅ request() 里通常已经“解壳”了 data，但你们批量导入接口很可能返回的是统一壳
  // 所以这里做一个兼容：如果长得像壳就原样用，否则包成 { code: 200, data: x }
  if (x && typeof x === "object") {
    const anyX = x as any;
    const hasCode = "code" in anyX;
    const hasMsg = "msg" in anyX;
    const hasData = "data" in anyX;
    if (hasCode || hasMsg || hasData) {
      return {
        code: typeof anyX.code === "number" ? anyX.code : undefined,
        msg: typeof anyX.msg === "string" ? anyX.msg : undefined,
        data: anyX.data,
        timestamp:
          typeof anyX.timestamp === "number" ? anyX.timestamp : undefined,
      };
    }
  }
  return { code: 200, msg: "操作成功", data: x };
}

export function useUserImportFlow(options?: { onNotify?: Notify }) {
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // =========================
  // 1) 预览弹窗状态
  // =========================
  const [preview, setPreview] = useState<ImportPreviewState>({
    open: false,
    rows: [],
    stats: { total: 0, emptyRequiredCount: 0, duplicateUsernameCount: 0 },
    invalidRowIndexes: [],
  });

  const [parsing, setParsing] = useState(false);
  const parsingRef = useRef(false);

  const openPreview = useCallback(() => {
    setPreview((s) => ({ ...s, open: true }));
  }, []);

  const closePreview = useCallback(() => {
    setPreview((s) => ({ ...s, open: false }));
  }, []);

  const resetPreview = useCallback(() => {
    setPreview({
      open: false,
      rows: [],
      stats: { total: 0, emptyRequiredCount: 0, duplicateUsernameCount: 0 },
      invalidRowIndexes: [],
    });
  }, []);

  // =========================
  // 2) 结果弹窗状态
  // =========================
  const [result, setResult] = useState<ImportResultState>({
    open: false,
    result: undefined,
  });

  const openResult = useCallback((r: ApiShellResult) => {
    setResult({ open: true, result: r });
  }, []);

  const closeResult = useCallback(() => {
    setResult((s) => ({ ...s, open: false }));
  }, []);

  // =========================
  // 3) 解析文件 → 预览
  // =========================
  const parseFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (parsingRef.current) return;

      // 简单校验：xls/xlsx
      const name = file.name ?? "";
      const okExt = /\.(xlsx|xls)$/i.test(name);
      if (!okExt) {
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
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: "",
        });

        const rows = mapSheetRowsToPreview(json);
        const { stats, invalidRowIndexes } = buildStats(rows);

        setPreview({
          open: true,
          fileName: name,
          rows,
          stats,
          invalidRowIndexes,
        });

        if (rows.length === 0) {
          notify({ kind: "info", msg: "未解析到有效数据（可能是空表）" });
        }
      } catch (err) {
        // ✅ 失败提示：优先后端 msg（这里多半是本地解析错误，没有后端 msg，就 fallback）
        notify({
          kind: "error",
          msg: errToMsg(err, "解析文件失败，请检查模板是否正确"),
        });
        throw err;
      } finally {
        parsingRef.current = false;
        setParsing(false);
      }
    },
    [notify],
  );

  // =========================
  // 4) 提交导入（页面层负责二次确认）
  // =========================
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submitImport = useCallback(async () => {
    if (submittingRef.current) return;

    const rows = preview.rows ?? [];
    if (rows.length === 0) {
      notify({ kind: "info", msg: "请先上传并解析文件" });
      return;
    }

    // 有必填缺失 / 重复：不强行阻断，但给提醒更稳
    if (preview.stats.emptyRequiredCount > 0) {
      notify({
        kind: "info",
        msg: `存在 ${preview.stats.emptyRequiredCount} 行必填缺失，建议修正后再导入`,
      });
    }
    if (preview.stats.duplicateUsernameCount > 0) {
      notify({
        kind: "info",
        msg: `存在 ${preview.stats.duplicateUsernameCount} 个重复学号，建议修正后再导入`,
      });
    }

    const payload = previewToPayload(rows);

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const r = await batchInsertUser(payload);

      // ✅ 不再假设 successCount/failCount，直接把“后端返回壳”交给页面展示
      const shell = toShellResult(r);
      openResult(shell);

      // ✅ 关闭预览（也可以不关，看你页面交互）
      closePreview();

      // ✅ 提示信息优先后端 msg（shell.msg 就是后端 msg）
      if (shell.code === 200) {
        notify({
          kind: "success",
          msg: (shell.msg ?? "").trim() || "导入成功",
        });
      } else {
        notify({ kind: "error", msg: (shell.msg ?? "").trim() || "导入失败" });
      }
    } catch (err) {
      // ✅ 失败：优先 err.message（ApiError.message=后端 msg）
      notify({ kind: "error", msg: errToMsg(err, "导入失败") });
      throw err;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [closePreview, notify, openResult, preview.rows, preview.stats]);

  return {
    // preview state
    preview,
    parsing,
    openPreview,
    closePreview,
    resetPreview,
    parseFile,

    // submit
    submitting,
    submitImport,

    // result state
    result,
    openResult,
    closeResult,
  };
}
