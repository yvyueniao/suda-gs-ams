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
    name: "梁靖松1",
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

// ===============================
// ✅ 自动补齐 users 到 200 条（稳定可复现）
// - 不手写长数组，避免维护灾难
// - 每次启动 mock 数据一致（固定 seed）
// ===============================

/** 简单可复现随机数（LCG） */
function createRng(seed = 20260225) {
  let s = seed >>> 0;
  return () => {
    // LCG: X_{n+1} = (aX_n + c) mod 2^32
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmt(dt: Date) {
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const d = pad2(dt.getDate());
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());
  const ss = pad2(dt.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function seedUsersTo(target = 200) {
  const rng = createRng(20260225);

  const familyNames = [
    "赵",
    "钱",
    "孙",
    "李",
    "周",
    "吴",
    "郑",
    "王",
    "冯",
    "陈",
    "褚",
    "卫",
    "蒋",
    "沈",
    "韩",
    "杨",
    "朱",
    "秦",
    "尤",
    "许",
    "何",
    "吕",
    "施",
    "张",
  ];
  const givenNames = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "子涵",
    "雨桐",
    "浩然",
    "梓轩",
    "欣怡",
    "佳宁",
    "宇航",
    "明哲",
    "思远",
    "若曦",
    "晨曦",
    "子墨",
    "亦辰",
    "可欣",
  ];
  const majors = [
    "软件工程",
    "计算机科学与技术",
    "网络空间安全",
    "人工智能",
    "数据科学与大数据技术",
    "信息安全",
    "电子信息",
    "计算机技术",
  ];
  const grades = ["1", "2", "研一", "研二"];
  const roles: Role[] = [4, 4, 4, 4, 4, 3, 2, 1, 0]; // 普通用户更多，少量高权限

  // 基准时间：2026-02-01 ~ 2026-02-25 之间
  const base = new Date("2026-02-01T08:00:00");

  const usernameSet = new Set(users.map((u) => u.username));

  while (users.length < target) {
    const id = users.length + 1;

    // 从 20254227090 往后生成（避免和你已有的 087/088/089 冲突）
    let seq = 86 + id; // id=4 => 90；id=200 => 286（够用）
    let username = `20254227${String(seq).padStart(3, "0")}`;
    while (usernameSet.has(username)) {
      seq += 1;
      username = `20254227${String(seq).padStart(3, "0")}`;
    }
    usernameSet.add(username);

    const name = `${pick(rng, familyNames)}${pick(rng, givenNames)}${id}`;
    const major = pick(rng, majors);
    const grade = pick(rng, grades);
    const role = pick(rng, roles);

    // invalid=true 表示“正常”这一口径你前面用过，这里保持大多数正常
    const invalid = rng() < 0.88;

    // 时间：createTime 在 base 后 0~24 天，lastLoginTime 在 createTime 后 0~12 天
    const createOffsetDays = clampInt(rng() * 25, 0, 24);
    const createOffsetMins = clampInt(rng() * 24 * 60, 0, 1439);
    const createDt = new Date(base);
    createDt.setDate(createDt.getDate() + createOffsetDays);
    createDt.setMinutes(createDt.getMinutes() + createOffsetMins);

    const loginOffsetDays = clampInt(rng() * 13, 0, 12);
    const loginOffsetMins = clampInt(rng() * 24 * 60, 0, 1439);
    const loginDt = new Date(createDt);
    loginDt.setDate(loginDt.getDate() + loginOffsetDays);
    loginDt.setMinutes(loginDt.getMinutes() + loginOffsetMins);

    users.push({
      id,
      username,
      name,
      role,
      department: null, // 初始不挂部门；后面 appointRole 会挂
      invalid,
      menuPermission: null,
      email: `${username}@qq.com`,
      major,
      grade,
      createTime: fmt(createDt),
      lastLoginTime: fmt(loginDt),
      serviceScore: clampInt(rng() * 51, 0, 50),
      lectureNum: clampInt(rng() * 31, 0, 30),
    });
  }
}

// ✅ 补齐到 200 条
seedUsersTo(200);

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
