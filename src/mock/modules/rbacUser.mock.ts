// src/mock/modules/rbacUser.mock.ts

import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { fail, ok, parseJson, sendJson } from "../core/http";

/**
 * RBAC - 用户管理 mock
 *
 * 覆盖接口：
 * - POST /user/pages
 * - POST /user/batchInsertUser
 * - POST /user/insert
 * - POST /user/batchDelete
 * - POST /user/batchLock
 * - POST /user/unlock
 * - POST /user/info
 *
 * ✅ 兼容 /api 前缀：/api/user/*
 */

type Role = 0 | 1 | 2 | 3 | 4;

type MockUser = {
  id: number;
  username: string;
  name: string;

  email: string;
  major: string;
  grade: string;

  invalid: boolean;
  role: Role;
  menuPermission: unknown | null;

  createTime: string;
  lastLoginTime: string;

  serviceScore: number;
  lectureNum: number;

  department: string | null;
};

let nextId = 1000;

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function nowStr() {
  return formatTime(new Date());
}

const users: MockUser[] = [
  {
    id: 1,
    username: "20254227087",
    name: "梁靖松",
    invalid: false,
    role: 0,
    menuPermission: null,
    email: "459802134@qq.com",
    major: "软件工程",
    grade: "研一",
    createTime: "2026-02-01 12:00:30",
    lastLoginTime: "2026-02-11 20:13:57",
    serviceScore: 25,
    lectureNum: 22,
    department: "文体部",
  },
  {
    id: 10,
    username: "20234227087",
    name: "李四",
    invalid: false,
    role: 3,
    menuPermission: null,
    email: "123456@qq.com",
    major: "计算机科学与技术",
    grade: "研一",
    createTime: "2026-02-02 13:30:44",
    lastLoginTime: "2026-02-06 17:03:13",
    serviceScore: 0,
    lectureNum: 0,
    department: "学术部",
  },
  {
    id: 11,
    username: "20224227089",
    name: "王二",
    invalid: true,
    role: 4,
    menuPermission: null,
    email: "1234567@qq.com",
    major: "计算机科学与技术",
    grade: "博一",
    createTime: "2026-02-03 09:11:21",
    lastLoginTime: "2026-02-08 10:22:33",
    serviceScore: 3,
    lectureNum: 1,
    department: null,
  },
];

nextId = Math.max(...users.map((u) => u.id)) + 1;

function containsLike(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function toStringSafe(x: unknown) {
  return String(x ?? "").trim();
}

function isRole(x: any): x is Role {
  return x === 0 || x === 1 || x === 2 || x === 3 || x === 4;
}

function listUserShape(u: MockUser) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    invalid: u.invalid,
    role: u.role,
    menuPermission: u.menuPermission,

    email: u.email,
    major: u.major,
    grade: u.grade,

    createTime: u.createTime,
    lastLoginTime: u.lastLoginTime,

    serviceScore: u.serviceScore,
    lectureNum: u.lectureNum,
  };
}

export function setupRbacUserMock(middlewares: Connect.Server) {
  middlewares.use(
    async (req: Connect.IncomingMessage, res: ServerResponse, next) => {
      try {
        const url = req.url ?? "";
        const method = (req.method ?? "GET").toUpperCase();

        // ✅ 兼容 /api 前缀（你的真实请求是 /api/user/*）
        const path = url.replace(/^\/api/, "");

        // 只处理 /user/*，其他放行
        if (!path.startsWith("/user/")) return next();

        // 全部需要鉴权
        if (!requireAuth(req, res)) return;

        // 只支持 POST
        if (method !== "POST") {
          sendJson(res, 405, fail("Method Not Allowed", 405));
          return;
        }

        // POST /user/pages
        if (path.startsWith("/user/pages")) {
          const body = await parseJson(req);
          const pageNum = Number(body?.pageNum ?? 1);
          const pageSize = Number(body?.pageSize ?? 10);
          const key = toStringSafe(body?.key);

          const filtered = key
            ? users.filter(
                (u) =>
                  containsLike(u.username, key) || containsLike(u.name, key),
              )
            : [...users];

          const count = filtered.length;

          const safePageNum =
            Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
          const safePageSize =
            Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;

          const start = (safePageNum - 1) * safePageSize;
          const pageItems = filtered.slice(start, start + safePageSize);

          sendJson(
            res,
            200,
            ok({
              count,
              pageNum: safePageNum,
              users: pageItems.map(listUserShape),
            }),
          );
          return;
        }

        // POST /user/info
        if (path.startsWith("/user/info")) {
          const body = await parseJson(req);
          const username =
            typeof body === "string"
              ? toStringSafe(body)
              : toStringSafe(body?.username);

          if (!username) {
            sendJson(res, 400, fail("username 不能为空", 400));
            return;
          }

          const u = users.find((x) => x.username === username);
          if (!u) {
            sendJson(res, 404, fail("用户不存在", 404));
            return;
          }

          sendJson(
            res,
            200,
            ok({
              user: {
                ...listUserShape(u),
                department: u.department,
              },
              token: "mock-token-keep-session",
            }),
          );
          return;
        }

        // POST /user/insert
        if (path.startsWith("/user/insert")) {
          const body = await parseJson(req);

          const username = toStringSafe(body?.username);
          const password = toStringSafe(body?.password);
          const name = toStringSafe(body?.name);
          const email = toStringSafe(body?.email);
          const major = toStringSafe(body?.major);
          const grade = toStringSafe(body?.grade);

          if (!username || !password || !name || !email || !major || !grade) {
            sendJson(res, 400, fail("必填字段缺失", 400));
            return;
          }

          if (users.some((u) => u.username === username)) {
            sendJson(res, 400, fail("username 已存在", 400));
            return;
          }

          const t = nowStr();
          const newUser: MockUser = {
            id: nextId++,
            username,
            name,
            email,
            major,
            grade,
            invalid: false,
            role: 4,
            menuPermission: null,
            createTime: t,
            lastLoginTime: t,
            serviceScore: 0,
            lectureNum: 0,
            department: null,
          };

          users.unshift(newUser);

          sendJson(res, 200, ok("成功添加1条数据"));
          return;
        }

        // POST /user/batchInsertUser
        if (path.startsWith("/user/batchInsertUser")) {
          const body = await parseJson(req);

          if (!Array.isArray(body)) {
            sendJson(res, 400, fail("入参必须是数组", 400));
            return;
          }

          const incoming = body as Array<Record<string, any>>;

          let successCount = 0;
          let failCount = 0;

          const failedDetails: Array<{ username: string; reason: string }> = [];
          const failedUsernames: string[] = [];

          const batchSeen = new Set<string>();

          for (const [idx, raw] of incoming.entries()) {
            const username = toStringSafe(raw?.username);
            const password = toStringSafe(raw?.password);
            const name = toStringSafe(raw?.name);
            const email = toStringSafe(raw?.email);
            const major = toStringSafe(raw?.major);
            const grade = toStringSafe(raw?.grade);

            const rowNo = idx + 1;

            if (!username || !password || !name || !email || !major || !grade) {
              failCount += 1;
              const u = username || `ROW_${rowNo}`;
              failedUsernames.push(u);
              failedDetails.push({ username: u, reason: "必填字段缺失" });
              continue;
            }

            if (batchSeen.has(username)) {
              failCount += 1;
              failedUsernames.push(username);
              failedDetails.push({ username, reason: "导入文件内学号重复" });
              continue;
            }
            batchSeen.add(username);

            if (users.some((u) => u.username === username)) {
              failCount += 1;
              failedUsernames.push(username);
              failedDetails.push({ username, reason: "学号已存在" });
              continue;
            }

            const t = nowStr();
            const newUser: MockUser = {
              id: nextId++,
              username,
              name,
              email,
              major,
              grade,
              invalid: false,
              role: isRole(raw?.role) ? raw.role : 4,
              menuPermission: null,
              createTime: t,
              lastLoginTime: t,
              serviceScore: 0,
              lectureNum: 0,
              department: null,
            };

            users.unshift(newUser);
            successCount += 1;
          }

          const result = {
            successCount,
            failCount,
            failedUsernames: failedUsernames.length
              ? failedUsernames
              : undefined,
            failedDetails: failedDetails.length ? failedDetails : undefined,
            failedFileUrl: undefined,
          };

          sendJson(res, 200, ok(result));
          return;
        }

        // POST /user/batchDelete
        if (path.startsWith("/user/batchDelete")) {
          const body = await parseJson(req);

          if (!Array.isArray(body)) {
            sendJson(res, 400, fail("入参必须是 username 数组", 400));
            return;
          }

          const list = body.map(toStringSafe).filter(Boolean);
          if (list.length === 0) {
            sendJson(res, 400, fail("username 列表不能为空", 400));
            return;
          }

          let removed = 0;
          for (const u of list) {
            const idx = users.findIndex((x) => x.username === u);
            if (idx >= 0) {
              users.splice(idx, 1);
              removed += 1;
            }
          }

          sendJson(res, 200, ok(`成功删除${removed}条数据`));
          return;
        }

        // POST /user/batchLock
        if (path.startsWith("/user/batchLock")) {
          const body = await parseJson(req);

          if (!Array.isArray(body)) {
            sendJson(res, 400, fail("入参必须是 username 数组", 400));
            return;
          }

          const list = body.map(toStringSafe).filter(Boolean);
          if (list.length === 0) {
            sendJson(res, 400, fail("username 列表不能为空", 400));
            return;
          }

          let locked = 0;
          for (const u of list) {
            const it = users.find((x) => x.username === u);
            if (it && it.invalid !== true) {
              it.invalid = true;
              locked += 1;
            }
          }

          sendJson(res, 200, ok(`成功封锁${locked}个账户`));
          return;
        }

        // POST /user/unlock
        if (path.startsWith("/user/unlock")) {
          const body = await parseJson(req);
          const username = toStringSafe(body?.username);

          if (!username) {
            sendJson(res, 400, fail("username 不能为空", 400));
            return;
          }

          const it = users.find((x) => x.username === username);
          if (!it) {
            sendJson(res, 404, fail("用户不存在", 404));
            return;
          }

          it.invalid = false;

          sendJson(res, 200, ok("成功解封1个账户"));
          return;
        }

        next();
      } catch {
        sendJson(res, 500, fail("mock server error", 500));
      }
    },
  );
}
