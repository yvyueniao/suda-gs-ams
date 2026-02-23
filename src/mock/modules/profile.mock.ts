// src/mock/modules/profile.mock.ts
/**
 * Profile Mock（统一接入 mock/core 工具版）
 *
 * ✅ 对齐：真实后端接口文档 + 当前前端 Profile 模块 types/api/useProfile
 *
 * 模拟接口：
 * 1) POST /api/user/info
 * 2) POST /api/activity/userApplications
 * 3) POST /api/activity/searchById
 * 4) ✅ POST /api/user/updateEmail
 * 5) ✅ POST /api/user/modifyPassword
 */

import type { Connect } from "vite";

import { ok, fail, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";
import { requireAuth, MOCK_TOKEN } from "../core/auth";

/** -----------------------------
 * Mock 数据：用户信息（对齐 UserInfo /user/info）
 * - 注意：这里会被 updateEmail 修改（模拟“写回”）
 * ----------------------------- */
const mockUser = {
  id: 1,
  username: "20254227087",
  name: "梁靖松",
  invalid: true,
  role: 0,

  email: "123@qq.com",
  major: "软件工程",
  grade: "研一",
  department: "计算机学院研究生会",

  serviceScore: 5,
  lectureNum: 4,

  createTime: "2026-02-01 12:00:30",
  lastLoginTime: "2026-02-01 18:28:59",
};

/** Mock：旧密码（仅用于 modifyPassword 的最小校验） */
let mockOldPassword = "123";

/** -----------------------------
 * Mock 数据：报名记录（对齐 MyActivityItem /activity/userApplications）
 * - ✅ 必须包含 activityName
 * - ✅ checkOut mock 给全（前端类型是可选）
 * ----------------------------- */
const mockApplications = [
  {
    activityId: 1,
    activityName: "夜跑活动",
    username: "20254227087",

    type: 0,
    state: 0,
    score: 1,

    time: "2026-02-01 13:09:13",
    attachment: null,

    checkIn: true,
    checkOut: false,
    getScore: true,
  },
  {
    activityId: 2,
    activityName: "学术讲座：扩散模型入门与实践",
    username: "20254227087",

    type: 1,
    state: 1,
    score: 5,

    time: "2026-02-01 13:10:24",
    attachment: null,

    checkIn: false,
    checkOut: false,
    getScore: true,
  },
];

/** -----------------------------
 * Mock 数据：活动详情（对齐 ActivityDetail /activity/searchById）
 * ----------------------------- */
const mockActivityDetailMap: Record<number, any> = {
  1: {
    id: 1,
    name: "夜跑活动",
    description: "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
    department: "文体部",
    time: "2026-02-04 14:57:57",
    signStartTime: "2026-02-04 14:00:00",
    signEndTime: "2026-02-16 14:00:00",
    fullNum: 200,
    score: 20,
    location: "东区操场",
    activityStime: "2026-02-08 08:00:00",
    activityEtime: "2026-03-15 22:00:00",
    type: 0,
    state: 1,
    registeredNum: 1,
    candidateNum: 0,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
  2: {
    id: 2,
    name: "学术讲座：扩散模型入门与实践",
    description: "介绍扩散模型基础概念、采样方法与实践经验",
    department: "学术部",
    time: "2026-02-04 18:49:26",
    signStartTime: "2026-02-04 14:00:00",
    signEndTime: "2026-02-16 14:00:00",
    fullNum: 200,
    score: 5,
    location: "计算机楼 A401",
    activityStime: "2026-02-18 14:00:00",
    activityEtime: "2026-02-18 16:00:00",
    type: 1,
    state: 2,
    registeredNum: 1,
    candidateNum: 0,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
  3: {
    id: 3,
    name: "大模型前沿讲座（可报名成功示例）",
    description: "用于演示：未报名且未满 -> 报名成功 -> 我的报名状态变化",
    department: "学术部",
    time: "2026-02-02 10:20:00",
    signStartTime: "2026-02-03 10:00:00",
    signEndTime: "2026-02-25 10:00:00",
    fullNum: 80,
    score: 5,
    location: "本部报告厅",
    activityStime: "2026-02-26 19:00:00",
    activityEtime: "2026-02-26 21:00:00",
    type: 1,
    state: 2,
    registeredNum: 66, // ✅ 未满
    candidateNum: 0,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
};

function isValidEmail(email: string) {
  // 简单校验：够用即可（真实项目可交给后端更严格校验）
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** -----------------------------
 * 注册 Mock 路由
 * ----------------------------- */
export function setupProfileMock(middlewares: Connect.Server) {
  /**
   * POST /api/user/info
   */
  middlewares.use("/api/user/info", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    if (maybeEmpty(res, { user: null, token: MOCK_TOKEN }, "获取成功")) return;

    sendJson(
      res,
      200,
      ok(
        {
          user: mockUser,
          token: MOCK_TOKEN,
        },
        "获取成功",
      ),
    );
  });

  /**
   * POST /api/activity/userApplications
   */
  middlewares.use("/api/activity/userApplications", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    if (maybeEmpty(res, [], "操作成功")) return;

    sendJson(res, 200, ok(mockApplications, "操作成功"));
  });

  /**
   * POST /api/activity/searchById
   * body: { id }
   */
  middlewares.use("/api/activity/searchById", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    const body = await parseJson(req);
    const id = Number(body?.id);

    const activity = Number.isFinite(id) ? mockActivityDetailMap[id] : null;

    if (!activity) {
      sendJson(res, 200, ok({ activity: null }, "未找到活动"));
      return;
    }

    sendJson(res, 200, ok({ activity }, "操作成功"));
  });

  /**
   * ✅ POST /api/user/updateEmail
   * body: { email }
   */
  middlewares.use("/api/user/updateEmail", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    const body = await parseJson(req);
    const email = String(body?.email ?? "").trim();

    if (!email) {
      sendJson(res, 400, fail("email 不能为空", 400));
      return;
    }

    if (!isValidEmail(email)) {
      sendJson(res, 400, fail("邮箱格式不正确", 400));
      return;
    }

    // ✅ 写回（模拟后端更新）
    mockUser.email = email;

    sendJson(res, 200, ok("成功修改1条数据", "操作成功"));
  });

  /**
   * ✅ POST /api/user/modifyPassword
   * body: { oldPassword, newPassword1, newPassword2 }
   */
  middlewares.use("/api/user/modifyPassword", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    const body = await parseJson(req);
    const oldPassword = String(body?.oldPassword ?? "");
    const newPassword1 = String(body?.newPassword1 ?? "");
    const newPassword2 = String(body?.newPassword2 ?? "");

    if (!oldPassword || !newPassword1 || !newPassword2) {
      sendJson(res, 400, fail("参数不完整", 400));
      return;
    }

    if (newPassword1 !== newPassword2) {
      sendJson(res, 400, fail("两次新密码不一致", 400));
      return;
    }

    // 最小校验：旧密码必须正确（mock 默认 123）
    if (oldPassword !== mockOldPassword) {
      sendJson(res, 400, fail("旧密码不正确", 400));
      return;
    }

    // ✅ 写回（模拟后端更新密码）
    mockOldPassword = newPassword1;

    sendJson(res, 200, ok("成功修改1条数据", "操作成功"));
  });
}
