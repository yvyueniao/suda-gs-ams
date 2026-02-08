// src/mock/modules/profile.mock.ts
/**
 * Profile Mock（统一接入 mock/core 工具版）
 *
 * ✅ 按“真实后端接口文档 + 方案 C”对齐
 *
 * 模拟接口：
 * 1) POST /api/user/info
 *    - 个人中心「我的信息」
 *    - 返回：{ code,msg,data:{ user, token }, timestamp }
 *
 * 2) POST /api/activity/userApplications
 *    - 个人中心「我的活动/讲座报名记录」（关系表）
 *    - 返回：{ code,msg,data: MyActivityItem[], timestamp }
 *
 * 3) POST /api/activity/searchById
 *    - 活动/讲座详情（详情弹窗用）
 *    - body: { id }
 *    - 返回：{ code,msg,data:{ activity }, timestamp }
 *
 * 设计目标：
 * - 统一使用 core/http 的 ok/sendJson/parseJson
 * - 统一接入 faults：withDelay/maybeFail/maybeEmpty
 * - 统一接入 auth：requireAuth（校验 Authorization === MOCK_TOKEN）
 */

import type { Connect } from "vite";

import { ok, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";
import { requireAuth, MOCK_TOKEN } from "../core/auth";

/** -----------------------------
 * Mock 数据：用户信息（对齐 /user/info）
 * ----------------------------- */
const mockUser = {
  id: 1,
  username: "20254227087",
  name: "梁靖松",
  invalid: true,
  role: 2,
  menuPermission: null,
  email: "123@qq.com",
  major: "软件工程",
  grade: "研一",
  createTime: "2026-02-01 12:00:30",
  lastLoginTime: "2026-02-01 18:28:59",
  serviceScore: 3,
  lectureNum: 1,
  department: "计算机学院研究生会",
};

/** -----------------------------
 * Mock 数据：报名记录（对齐 /activity/userApplications）
 * ----------------------------- */
const mockApplications = [
  {
    activityId: 1,
    username: "20254227087",
    state: 0, // 报名成功
    time: "2026-02-01 13:09:13",
    attachment: null,
    checkIn: true,
    getScore: true,
    type: 0, // 活动
    score: 1,
  },
  {
    activityId: 2,
    username: "20254227087",
    state: 1, // 候补中
    time: "2026-02-01 13:10:24",
    attachment: null,
    checkIn: false,
    getScore: true,
    type: 1, // 讲座
    score: 5,
  },
];

/** -----------------------------
 * Mock 数据：活动详情（对齐 /activity/searchById）
 * - 用于个人中心“详情弹窗”
 * ----------------------------- */
const mockActivityDetailMap: Record<number, any> = {
  1: {
    id: 1,
    name: "夜跑活动",
    description: "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
    department: "文体部",
    time: "2026-02-04 14:57:57",
    signStartTime: "2026-02-04 14:00:00",
    signEndTime: "2026-02-06 14:00:00",
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
    signEndTime: "2026-02-06 14:00:00",
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
};

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

    // 空态：用于测试异常 UI（可选）
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
   * - 返回数组（对齐后端文档）
   */
  middlewares.use("/api/activity/userApplications", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    // 空态：用于测试 Empty
    if (maybeEmpty(res, [], "操作成功")) return;

    sendJson(res, 200, ok(mockApplications, "操作成功"));
  });

  /**
   * POST /api/activity/searchById
   * - body: { id }
   * - 返回 { activity }
   */
  middlewares.use("/api/activity/searchById", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    const body = await parseJson(req);
    const id = Number(body?.id);

    const activity = Number.isFinite(id) ? mockActivityDetailMap[id] : null;

    // 空态：activity 为 null（模拟“未找到”）
    if (!activity) {
      sendJson(res, 200, ok({ activity: null }, "未找到活动"));
      return;
    }

    sendJson(res, 200, ok({ activity }, "操作成功"));
  });
}
