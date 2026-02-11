// src/mock/modules/orgDepartment.mock.ts
import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { ok, fail, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";

/**
 * Org Department Mock
 *
 * 对齐后端接口：
 * - POST /department/allDepartment
 * - POST /department/create
 * - POST /department/delete
 *
 * 关键要求：
 * - ✅ create 后真实写入内存列表，下一次 allDepartment 能看到
 * - ✅ delete 后真实从内存列表移除，下一次 allDepartment 看不到
 */

type MockDepartmentItem = {
  id: number;
  department: string;
};

// ✅ 模块内“内存数据库”（dev server 生命周期内有效）
let seq = 3;
let departmentStore: MockDepartmentItem[] = [
  { id: 1, department: "文体部" },
  { id: 2, department: "学术部" },
];

/** 小工具：规范化部门名（去首尾空格） */
function normalizeName(v: unknown) {
  return String(v ?? "").trim();
}

/** 小工具：查找是否重复（忽略大小写/空格差异可按需调整，这里先最简单） */
function existsByName(name: string) {
  return departmentStore.some((d) => d.department === name);
}

export function setupOrgDepartmentMock(middlewares: Connect.Server): void {
  /**
   * 获取所有部门
   * POST /api/department/allDepartment
   */
  middlewares.use("/api/department/allDepartment", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res as ServerResponse)) return;

    if (!requireAuth(req, res as ServerResponse)) return;

    // ✅ 可选：空态注入（不影响你手动 create/delete 的真实写入逻辑）
    if (maybeEmpty(res as ServerResponse, [], "操作成功")) return;

    sendJson(res as ServerResponse, 200, ok(departmentStore, "操作成功"));
  });

  /**
   * 创建部门
   * POST /api/department/create
   * body: { department: string }
   */
  middlewares.use("/api/department/create", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res as ServerResponse)) return;

    if (!requireAuth(req, res as ServerResponse)) return;

    const body = (await parseJson(req)) as { department?: unknown };
    const name = normalizeName(body?.department);

    if (!name) {
      sendJson(res as ServerResponse, 400, fail("department 不能为空", 400));
      return;
    }

    if (existsByName(name)) {
      sendJson(res as ServerResponse, 400, fail("部门已存在", 400));
      return;
    }

    const item: MockDepartmentItem = { id: seq++, department: name };
    departmentStore = [item, ...departmentStore]; // 新建放前面，列表立刻可见

    sendJson(res as ServerResponse, 200, ok("成功创建1条数据", "操作成功"));
  });

  /**
   * 删除部门
   * POST /api/department/delete
   * body: { departmentId: number }
   */
  middlewares.use("/api/department/delete", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res as ServerResponse)) return;

    if (!requireAuth(req, res as ServerResponse)) return;

    const body = (await parseJson(req)) as { departmentId?: unknown };
    const idRaw = body?.departmentId;

    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;

    if (!Number.isFinite(id)) {
      sendJson(res as ServerResponse, 400, fail("departmentId 无效", 400));
      return;
    }

    const before = departmentStore.length;
    departmentStore = departmentStore.filter((d) => d.id !== id);

    if (departmentStore.length === before) {
      sendJson(res as ServerResponse, 404, fail("部门不存在", 404));
      return;
    }

    sendJson(res as ServerResponse, 200, ok("成功删除1条数据", "操作成功"));
  });
}
