// src/features/rbac/user/hooks/useUsersScoreByTimeExport.ts
/**
 * useUsersScoreByTimeExport
 *
 * ✅ 点击“导出”后：弹窗选择时间段 => 调 /user/usersScoreByTime => 导出 CSV
 * ✅ 默认导出所有字段（按后端返回对象 keys），不提供列设置/隐藏/调整
 * ✅ 表头中文化 + 值中文化（invalid / role）
 */

import { useCallback, useState } from "react";
import { usersScoreByTime } from "../../../../features/rbac/user/api";

export type UsersScoreByTimeRange = {
  startTime: string; // "YYYY-MM-DD" 或 "YYYY-MM-DD HH:mm:ss" 都可
  endTime: string;
};

/** 表头中文映射（只做你关心的，其他字段兜底用原 key） */
const HEADER_CN: Record<string, string> = {
  id: "ID",
  username: "学号",
  name: "姓名",
  invalid: "账号状态",
  role: "角色",
  menuPermission: "菜单权限",
  email: "邮箱",
  major: "专业",
  grade: "年级",
  createTime: "创建时间",
  lastLoginTime: "上次登录",
  serviceScore: "社会服务分",
  lectureNum: "讲座次数",
  department: "部门",
};

/** invalid 值中文化：后端口径 invalid=true => 正常；invalid=false => 封锁 */
function formatInvalid(v: unknown) {
  if (v === true) return "正常";
  if (v === false) return "封锁";
  return String(v ?? "");
}

/** role 值中文化（按你项目既有 ROLE_LABEL / 角色口径来写） */
const ROLE_CN: Record<number, string> = {
  0: "管理员",
  1: "主席",
  2: "部长",
  3: "干事",
  4: "普通学生",
};

function formatRole(v: unknown) {
  const n = Number(v);
  if (Number.isFinite(n) && ROLE_CN[n] != null) return ROLE_CN[n];
  return String(v ?? "");
}

/** 值中文化总入口（只改 invalid/role，其他原样输出） */
function formatCell(key: string, value: unknown) {
  if (key === "invalid") return formatInvalid(value);
  if (key === "role") return formatRole(value);
  return value;
}

/** 简单 CSV 转义 */
function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 触发浏览器下载（带 BOM 兼容 Excel） */
function downloadCsv(filename: string, csv: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();

  a.remove();
  URL.revokeObjectURL(url);
}

export function useUsersScoreByTimeExport(params: {
  onNotify?: (x: { kind: "success" | "error" | "info"; msg: string }) => void;
}) {
  const { onNotify } = params;

  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [range, setRange] = useState<UsersScoreByTimeRange>(() => ({
    startTime: "",
    endTime: "",
  }));

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  const setStartTime = useCallback((v: string) => {
    setRange((r) => ({ ...r, startTime: String(v ?? "").trim() }));
  }, []);

  const setEndTime = useCallback((v: string) => {
    setRange((r) => ({ ...r, endTime: String(v ?? "").trim() }));
  }, []);

  const setTimeRange = useCallback((startTime: string, endTime: string) => {
    setRange({
      startTime: String(startTime ?? "").trim(),
      endTime: String(endTime ?? "").trim(),
    });
  }, []);

  const exportByTime = useCallback(async () => {
    const startTime = String(range.startTime ?? "").trim();
    const endTime = String(range.endTime ?? "").trim();

    if (!startTime || !endTime) {
      onNotify?.({ kind: "info", msg: "请先选择开始时间与结束时间" });
      return;
    }
    if (exporting) return;

    setExporting(true);
    try {
      const rows = await usersScoreByTime({ startTime, endTime });
      const list = Array.isArray(rows) ? rows : [];

      // ✅ 默认导出所有字段：以第一条记录的 keys 为准
      const keys =
        list.length > 0 && list[0] && typeof list[0] === "object"
          ? Object.keys(list[0] as any)
          : [];

      const lines: string[] = [];

      // ✅ 表头中文
      lines.push(keys.map((k) => csvEscape(HEADER_CN[k] ?? k)).join(","));

      // ✅ 值中文化（invalid/role）
      for (const r of list) {
        const line = keys.map((k) => {
          const raw = (r as any)?.[k];
          const formatted = formatCell(k, raw);
          return csvEscape(formatted);
        });
        lines.push(line.join(","));
      }

      const filenameBase = `用户分数-${startTime.replace(
        /[:\s]/g,
        "_",
      )}_${endTime.replace(/[:\s]/g, "_")}`;

      downloadCsv(filenameBase, lines.join("\n"));

      onNotify?.({ kind: "success", msg: `已导出 ${list.length} 条数据` });
      setOpen(false);
    } catch (err: any) {
      onNotify?.({
        kind: "error",
        msg: err?.message ?? "导出失败，请稍后重试",
      });
      throw err;
    } finally {
      setExporting(false);
    }
  }, [exporting, onNotify, range.endTime, range.startTime]);

  return {
    open,
    openModal,
    closeModal,

    range,
    setStartTime,
    setEndTime,
    setTimeRange,

    exporting,
    exportByTime,
  };
}
