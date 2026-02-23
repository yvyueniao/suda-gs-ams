import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { sendJson, parseJson, ok, fail } from "../core/http";
import { requireAuth } from "../core/auth";

/**
 * ============================================
 * 内存数据（真实状态源）
 * - users   ：系统所有用户（/user/pages 搜索用）
 * - members ：部门成员（/department/allMembers 列表用），是 users 的子集/视图
 * ============================================
 */

type Role = 0 | 1 | 2 | 3 | 4;

type Department = {
  id: number;
  department: string;
};

type User = {
  id: number;
  username: string;
  name: string;
  role: Role;
  department: string | null;

  invalid: boolean;
  menuPermission: null;

  email: string;
  major: string;
  grade: string;

  createTime: string;
  lastLoginTime: string;

  serviceScore: number;
  lectureNum: number;
};

let nextId = 1000;

const departments: Department[] = [
  { id: 1, department: "文体部" },
  { id: 2, department: "学术部" },
  { id: 3, department: "组织部" },
  { id: 4, department: "宣传部" },
];

const users: User[] = [
  {
    id: 1,
    username: "20254227087",
    name: "梁靖松",
    invalid: true,
    role: 4,
    menuPermission: null,
    email: "459802134@qq.com",
    major: "软件工程",
    grade: "1",
    createTime: "2026-02-01 12:00:30",
    lastLoginTime: "2026-02-11 20:13:57",
    serviceScore: 25,
    lectureNum: 22,
    department: null,
  },
  {
    id: 2,
    username: "20254227088",
    name: "张三",
    invalid: true,
    role: 4,
    menuPermission: null,
    email: "zhangsan@qq.com",
    major: "计算机科学与技术",
    grade: "1",
    createTime: "2026-02-02 10:12:11",
    lastLoginTime: "2026-02-12 09:01:33",
    serviceScore: 0,
    lectureNum: 3,
    department: null,
  },
  {
    id: 3,
    username: "20254227089",
    name: "李四",
    invalid: true,
    role: 4,
    menuPermission: null,
    email: "lisi@qq.com",
    major: "软件工程",
    grade: "2",
    createTime: "2026-02-03 18:20:00",
    lastLoginTime: "2026-02-10 21:40:18",
    serviceScore: 8,
    lectureNum: 1,
    department: null,
  },
  {
    id: 4,
    username: "20244227001",
    name: "王五",
    invalid: false,
    role: 4,
    menuPermission: null,
    email: "wangwu@qq.com",
    major: "网络空间安全",
    grade: "研一",
    createTime: "2026-02-04 09:00:00",
    lastLoginTime: "2026-02-11 11:00:00",
    serviceScore: 2,
    lectureNum: 0,
    department: null,
  },
];

const members: User[] = [
  {
    ...users[0],
    role: 0,
    department: "文体部",
  },
];

function toUserPageItem(u: User) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    department: u.department,
  };
}

function includesIgnoreCase(hay: string, needle: string) {
  return String(hay ?? "")
    .toLowerCase()
    .includes(String(needle ?? "").toLowerCase());
}

/** ✅ 兼容 /api 前缀与 querystring */
function pathOf(url: string) {
  const p = (url.split("?")[0] ?? "").trim();
  return p.startsWith("/api/") ? p.slice(4) : p;
}

export function setupRbacAdminMock(middlewares: Connect.Server) {
  middlewares.use(async (req, res: ServerResponse, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/")) return next();

    const path = pathOf(url);

    // ===============================
    // 1) 获取所有部门成员（读接口：不鉴权）
    // POST /department/allMembers
    // ===============================
    if (path === "/department/allMembers" && req.method === "POST") {
      return sendJson(res, 200, ok(members));
    }

    // ===============================
    // 2) 获取所有部门（读接口：不鉴权）
    // POST /department/allDepartment
    // ===============================
    if (path === "/department/allDepartment" && req.method === "POST") {
      return sendJson(res, 200, ok(departments));
    }

    // ===============================
    // 5) 姓名/学号联想（读接口：不鉴权）
    // POST /user/pages
    // ===============================
    if (path === "/user/pages" && req.method === "POST") {
      const body = await parseJson(req);

      const pageNum = Math.max(1, Number(body?.pageNum ?? 1));
      const pageSize = Math.max(1, Math.min(100, Number(body?.pageSize ?? 20)));
      const key = String(body?.key ?? "").trim();

      const filtered = !key
        ? users
        : users.filter(
            (u) =>
              includesIgnoreCase(u.name, key) ||
              includesIgnoreCase(u.username, key) ||
              includesIgnoreCase(u.grade, key),
          );

      const count = filtered.length;
      const start = (pageNum - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      return sendJson(
        res,
        200,
        ok({
          count,
          pageNum,
          users: pageItems.map(toUserPageItem),
        }),
      );
    }

    // ======================================================
    // ✅ 写接口：鉴权（模拟真实后端）
    // ======================================================
    if (
      (path === "/department/deleteMember" ||
        path === "/department/appointRole") &&
      req.method === "POST"
    ) {
      if (!requireAuth(req, res)) return;
    }

    // ===============================
    // 3) 删除部门成员
    // POST /department/deleteMember
    // ===============================
    if (path === "/department/deleteMember" && req.method === "POST") {
      const body = await parseJson(req);
      const username = String(body?.username ?? "").trim();

      if (!username) {
        return sendJson(res, 200, fail("参数错误：username 不能为空"));
      }

      const idx = members.findIndex((m) => m.username === username);
      if (idx < 0) {
        return sendJson(res, 200, fail("成员不存在"));
      }

      members.splice(idx, 1);
      return sendJson(res, 200, ok("成功删除1个成员"));
    }

    // ===============================
    // 4) 任命职务
    // POST /department/appointRole
    // ===============================
    if (path === "/department/appointRole" && req.method === "POST") {
      const body = await parseJson(req);

      const username = String(body?.username ?? "").trim();
      const departmentId = Number(body?.departmentId);
      const role = Number(body?.role) as Role;

      if (
        !username ||
        !Number.isFinite(departmentId) ||
        !Number.isFinite(role)
      ) {
        return sendJson(res, 200, fail("参数不完整或格式错误"));
      }

      const dept = departments.find((d) => d.id === departmentId);
      if (!dept) {
        return sendJson(res, 200, fail("部门不存在"));
      }

      let user = users.find((u) => u.username === username);

      if (!user) {
        user = {
          id: nextId++,
          username,
          name: `用户${username.slice(-2)}`,
          invalid: false,
          role: 4,
          menuPermission: null,
          email: "",
          major: "未知专业",
          grade: "1",
          createTime: new Date().toISOString(),
          lastLoginTime: new Date().toISOString(),
          serviceScore: 0,
          lectureNum: 0,
          department: null,
        };
        users.push(user);
      }

      user.role = role;
      user.department = dept.department;

      const existMember = members.find((m) => m.username === username);
      if (existMember) {
        existMember.role = role;
        existMember.department = dept.department;
      } else {
        members.push({ ...user });
      }

      return sendJson(res, 200, ok("成功添加1个角色"));
    }

    next();
  });
}
