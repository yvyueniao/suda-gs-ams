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
 * - ✅ 扩充到 200 条，便于压测：搜索/排序/分页/导出/列设置
 * ----------------------------- */
const mockApplications = (() => {
  // 先保留你原来的两条（完全不改）
  const base = [
    {
      activityId: 1,
      activityName: "夜跑活动1",
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

  // 生成其余 198 条（总数 200）
  const result: any[] = [...base];

  const activityNames = [
    "夜跑活动",
    "羽毛球训练营",
    "志愿服务：校园清洁",
    "社团交流：破冰活动",
    "创新创业分享会",
    "研究生心理健康讲座",
    "学术讲座：Transformer 实战",
    "学术讲座：扩散模型采样加速",
    "讲座：科研写作与投稿",
    "讲座：工程化与前端可观测性",
    "活动：迎新志愿服务",
    "活动：体育嘉年华",
  ];

  // 0:报名成功/1:候补中/2:候补成功/3:候补失败/4:审核中/5:审核失败
  const states = [0, 0, 0, 2, 1, 3, 4, 5]; // 让成功占比更高

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  // 从 2026-02-01 之后按分钟递增，保证 time 看起来合理
  // 这里把范围铺到 2~3 月，便于你排序/搜索体验
  let day = 1;
  let hour = 9;
  let minute = 0;

  for (let i = 3; i <= 200; i++) {
    // 名称、类型、状态分布
    const name = activityNames[i % activityNames.length] + `${i}`;
    const type = i % 3 === 0 ? 1 : 0; // 约 1/3 讲座
    const state = states[i % states.length];

    // 分数：活动一般 1~5，讲座一般 2~10（做点波动）
    const score = type === 1 ? (i % 9) + 2 : (i % 5) + 1;

    // 签到签退：成功/候补成功更可能签到；候补中/审核中一般未签到
    const checkIn = state === 0 || state === 2 ? i % 4 !== 0 : false; // 75% 左右
    const checkOut = checkIn ? i % 6 === 0 : false; // 一部分签退

    // 是否加分：只有成功/候补成功才可能加分
    const getScore = state === 0 || state === 2 ? i % 7 !== 0 : false;

    // 附件：少量记录有附件
    const attachment =
      i % 17 === 0
        ? `http://localhost:8088/plik-proxy/file/mock/${i}/upload_${i}_证明材料.pdf`
        : null;

    // 时间推进：每条 + 7~13 分钟（让数据更像真实）
    minute += 7 + (i % 7); // 7~13
    while (minute >= 60) {
      minute -= 60;
      hour += 1;
    }
    while (hour >= 24) {
      hour -= 24;
      day += 1;
    }

    // 控制日期别跑太离谱（2月最多到 28）
    // 超过 28 之后滚到 3 月
    let month = 2;
    let dayInMonth = day;
    if (dayInMonth > 28) {
      month = 3;
      dayInMonth = dayInMonth - 28;
    }

    const time = `2026-${pad2(month)}-${pad2(dayInMonth)} ${pad2(
      hour,
    )}:${pad2(minute)}:${pad2(i % 60)}`;

    result.push({
      activityId: i,
      activityName: name,
      username: "20254227087",

      type,
      state,
      score,

      time,
      attachment,

      checkIn,
      checkOut,
      getScore,
    });
  }

  return result;
})();

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
