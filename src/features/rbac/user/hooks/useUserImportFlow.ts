// src/features/rbac/user/hooks/useUserImportFlow.ts

import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import type { Notify } from "../../../../shared/ui";
import type { UserCreatePayload, UserImportPreviewRow } from "../types";
import { batchInsertUser } from "../api";
import {
  INIT_EMAIL,
  getStrongPasswordError,
  hasDigitInName,
  isValidEmail,
  isValidUsername11Digits,
} from "../../../../shared/utils/accountValidation";

/** ✅ 稳定 noop，避免 callback 抖动 */
const noopNotify: Notify = () => {
  // noop
};

type ImportPreviewStats = {
  total: number;
  importableCount: number;
  emptyRequiredCount: number;
  duplicateUsernameCount: number;
  invalidUsernameCount: number;
  invalidEmailCount: number;
  invalidNameCount: number;
  invalidPasswordCount: number;
  initEmailCount: number;
  invalidGradeCount: number;
};

type ImportPreviewState = {
  open: boolean;
  fileName?: string;
  rows: UserImportPreviewRow[];
  stats: ImportPreviewStats;
  /** 可选：把“有问题的行”给 UI 标红 */
  invalidRowIndexes: number[];

  issueExamples: string[];
};

const INITIAL_PREVIEW_STATE: ImportPreviewState = {
  open: false,
  rows: [],
  stats: {
    total: 0,
    importableCount: 0,
    emptyRequiredCount: 0,
    duplicateUsernameCount: 0,
    invalidUsernameCount: 0,
    invalidEmailCount: 0,
    invalidNameCount: 0,
    invalidPasswordCount: 0,
    initEmailCount: 0,
    invalidGradeCount: 0,
  },
  invalidRowIndexes: [],
  issueExamples: [],
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
  const msg =
    err instanceof Error && typeof err.message === "string"
      ? err.message.trim()
      : "";
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
 * ✅ 年级校验（与你 CreateUserModal 一致口径）
 * - 格式：YYYY-硕 或 YYYY-博
 * - 年份范围：2000~2100（可按需调整）
 */
function validateGrade(v: unknown): { ok: boolean; msg?: string } {
  const s = normalizeText(v);
  if (!s) return { ok: false, msg: "年级为空" };

  const m = /^(\d{4})-(硕|博)$/.exec(s);
  if (!m) {
    return {
      ok: false,
      msg: "年级格式应为：YYYY-硕 或 YYYY-博（例如：2024-硕）",
    };
  }

  const year = Number(m[1]);
  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    return { ok: false, msg: "入学年份不合法，请填写 2000-2100 之间的年份" };
  }

  return { ok: true };
}

function getRowIssues(row: UserImportPreviewRow): string[] {
  const issues: string[] = [];
  const username = normalizeText(row.username);
  const password = normalizeText(row.password);
  const name = normalizeText(row.name);
  const email = normalizeText(row.email);
  const major = normalizeText(row.major);
  const grade = normalizeText(row.grade);

  if (!username || !password || !name || !email || !major || !grade) {
    issues.push("必填项缺失");
  }
  if (username && !isValidUsername11Digits(username)) {
    issues.push("学号必须为 11 位数字");
  }
  if (name && hasDigitInName(name)) {
    issues.push("姓名不能包含数字字符");
  }
  if (email && !isValidEmail(email)) {
    issues.push("邮箱格式不正确");
  }

  const pwdError = getStrongPasswordError(password);
  if (password && pwdError) {
    issues.push(pwdError);
  }

  if (grade) {
    const gradeValidation = validateGrade(grade);
    if (!gradeValidation.ok && gradeValidation.msg) {
      issues.push(gradeValidation.msg);
    }
  }

  return issues;
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
  jsonRows: Record<string, unknown>[],
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
  issueExamples: string[];
} {
  const invalidRowIndexes: number[] = [];
  const issueExamples: string[] = [];

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
  let invalidGradeCount = 0;
  let invalidUsernameCount = 0;
  let invalidEmailCount = 0;
  let invalidNameCount = 0;
  let invalidPasswordCount = 0;
  let initEmailCount = 0;

  rows.forEach((r, idx) => {
    const hasEmpty = requiredKeys.some((k) => !normalizeText(r[k]));
    if (hasEmpty) {
      emptyRequiredCount += 1;
      invalidRowIndexes.push(idx);
    }

    const username = normalizeText(r.username);
    const email = normalizeText(r.email);
    const name = normalizeText(r.name);
    const password = normalizeText(r.password);

    if (email === INIT_EMAIL) {
      initEmailCount += 1;
    }
    if (username && !isValidUsername11Digits(username)) invalidUsernameCount += 1;
    if (email && !isValidEmail(email)) invalidEmailCount += 1;
    if (name && hasDigitInName(name)) invalidNameCount += 1;
    if (password && getStrongPasswordError(password)) invalidPasswordCount += 1;

    const issues = getRowIssues(r);
    if (issues.length > 0) {
      if (!invalidRowIndexes.includes(idx)) invalidRowIndexes.push(idx);
      if (issueExamples.length < 10) {
        const excelRowNo = idx + 2;
        const u = username || "-";
        issueExamples.push(`第${excelRowNo}行（学号：${u}）：${issues.join("；")}`);
      }
    }

    const vg = validateGrade(r.grade);
    if (!vg.ok) {
      invalidGradeCount += 1;
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
      importableCount: pickImportableRows(rows).length,
      emptyRequiredCount,
      duplicateUsernameCount,
      invalidUsernameCount,
      invalidEmailCount,
      invalidNameCount,
      invalidPasswordCount,
      initEmailCount,
      invalidGradeCount,
    },
    invalidRowIndexes: invalidRowIndexes.sort((a, b) => a - b),
    issueExamples,
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

function isRowImportable(row: UserImportPreviewRow): boolean {
  const issues = getRowIssues(row);
  return issues.length === 0;
}

function pickImportableRows(
  rows: UserImportPreviewRow[],
): UserImportPreviewRow[] {
  const seen = new Set<string>();
  const importable: UserImportPreviewRow[] = [];

  for (const row of rows) {
    if (!isRowImportable(row)) continue;
    const username = normalizeText(row.username);
    if (!username) continue;
    if (seen.has(username)) continue;
    seen.add(username);
    importable.push(row);
  }

  return importable;
}

function toShellResult(x: unknown): ApiShellResult {
  // ✅ request() 里通常已经“解壳”了 data，但你们批量导入接口很可能返回的是统一壳
  // 所以这里做一个兼容：如果长得像壳就原样用，否则包成 { code: 200, data: x }
  if (x && typeof x === "object") {
    const maybeShell = x as Record<string, unknown>;
    const hasCode = "code" in maybeShell;
    const hasMsg = "msg" in maybeShell;
    const hasData = "data" in maybeShell;
    if (hasCode || hasMsg || hasData) {
      return {
        code: typeof maybeShell.code === "number" ? maybeShell.code : undefined,
        msg: typeof maybeShell.msg === "string" ? maybeShell.msg : undefined,
        data: maybeShell.data,
        timestamp:
          typeof maybeShell.timestamp === "number"
            ? maybeShell.timestamp
            : undefined,
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
  const [preview, setPreview] = useState<ImportPreviewState>(
    INITIAL_PREVIEW_STATE,
  );

  const [parsing, setParsing] = useState(false);
  const parsingRef = useRef(false);

  const openPreview = useCallback(() => {
    setPreview({ ...INITIAL_PREVIEW_STATE, open: true });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(INITIAL_PREVIEW_STATE);
  }, []);

  const resetPreview = useCallback(() => {
    setPreview(INITIAL_PREVIEW_STATE);
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
    setResult({ open: false, result: undefined });
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
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const rows = mapSheetRowsToPreview(json);
        const { stats, invalidRowIndexes, issueExamples } = buildStats(rows);

        setPreview({
          open: true,
          fileName: name,
          rows,
          stats,
          invalidRowIndexes,
          issueExamples,
        });

        if (rows.length === 0) {
          notify({ kind: "info", msg: "未解析到有效数据（可能是空表）" });
        } else {
          if (stats.initEmailCount > 0) {
            notify({
              kind: "info",
              msg: `检测到 ${stats.initEmailCount} 条初始邮箱（${INIT_EMAIL}）记录`,
            });
          }

          if (issueExamples.length > 0) {
            notify({
              kind: "info",
              msg: `发现 ${invalidRowIndexes.length} 行数据不合规，预览里可查看明细（示例：${issueExamples[0]}）`,
            });
          }
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

    if (preview.stats.initEmailCount > 0) {
      notify({
        kind: "info",
        msg: `本次包含 ${preview.stats.initEmailCount} 条初始邮箱记录（${INIT_EMAIL}）`,
      });
    }

    const importableRows = pickImportableRows(rows);
    const payload = previewToPayload(importableRows);
    const skippedCount = rows.length - importableRows.length;
    if (skippedCount > 0) {
      notify({
        kind: "info",
        msg: `本次将跳过 ${skippedCount} 行问题/重复数据，仅提交 ${importableRows.length} 行`,
      });
    }

    if (payload.length === 0) {
      notify({
        kind: "error",
        msg: "没有可提交的有效数据，请修正后再导入",
      });
      return;
    }

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
      const msg = errToMsg(err, "导入失败");
      openResult({
        code: 500,
        msg,
        data: `提交失败（尝试提交 ${payload.length} 行）`,
        timestamp: Date.now(),
      });
      notify({ kind: "error", msg });
      throw err;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    closePreview,
    notify,
    openResult,
    preview.rows,
    preview.stats,
  ]);

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
