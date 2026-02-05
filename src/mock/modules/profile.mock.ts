// src/mock/modules/profile.mock.ts
/**
 * Profile Mock（统一接入 mock/core 工具版）
 *
 * 模拟接口：
 * 1) POST /api/user/info
 *    - 个人中心「我的信息」
 *    - 返回：{ code,msg,data:{ user, token }, timestamp }
 *
 * 2) POST /api/profile/myActivities
 *    - 个人中心「我的活动 / 讲座列表」
 *    - 返回：{ code,msg,data:{ list, total }, timestamp }
 *
 * 设计目标：
 * - 统一使用 core/http 的 ok/fail/sendJson/parseJson
 * - 统一接入 faults：withDelay/maybeFail/maybeEmpty
 * - 统一接入 auth：requireAuth（校验 Authorization === MOCK_TOKEN）
 */

import type { Connect } from "vite";

import { ok, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";
import { requireAuth, MOCK_TOKEN } from "../core/auth";

/** -----------------------------
 * Mock 数据：用户信息
 * - 字段对齐你接口文档（/user/info 返回的 user）
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
 * Mock 数据：我的活动 / 讲座
 * - 你后端未给格式：这里以“列表页最常用字段”为主
 * ----------------------------- */
const mockActivities = [
  {
    id: 101,
    title: "金穗讲堂：就业与职业规划分享",
    category: "lecture" as const,
    status: "signed" as const,
    timeRange: "2026-02-08 19:00-21:00",
    location: "天赐庄校区 · 逸夫楼 201",
    organizer: "计算机学院研究生会",
    serviceScoreGain: 0,
    createdAt: "2026-02-01 12:00:30",
  },
  {
    id: 102,
    title: "志愿服务：校园环境整治活动",
    category: "activity" as const,
    status: "attended" as const,
    timeRange: "2026-02-10 09:00-11:30",
    location: "天赐庄校区 · 东门集合",
    organizer: "校团委",
    serviceScoreGain: 2,
    createdAt: "2026-02-02 09:12:11",
  },
  {
    id: 103,
    title: "学术讲座：扩散模型入门与实践",
    category: "lecture" as const,
    status: "pending" as const,
    timeRange: "2026-02-18 14:00-16:00",
    location: "天赐庄校区 · 计算机楼 A401",
    organizer: "计算机学院",
    serviceScoreGain: 0,
    createdAt: "2026-02-03 10:20:00",
  },
];

/** -----------------------------
 * 小工具：安全数值化
 * ----------------------------- */
function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toStr(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

/** -----------------------------
 * 注册 Mock 路由
 * ----------------------------- */
export function setupProfileMock(middlewares: Connect.Server) {
  /**
   * POST /api/user/info
   * - 需要登录（requireAuth）
   * - 返回格式对齐你的后端文档：data: { user, token }
   */
  middlewares.use("/api/user/info", async (req, res) => {
    // 只处理 POST（其他方法忽略，交给后续中间件）
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    // 空态：这里意义不大，但为了统一框架，给个 null user 的空态测试也行
    // 你也可以删掉这一段
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
   * POST /api/profile/myActivities
   * - 需要登录（requireAuth）
   * - body: { page, pageSize, keyword }
   * - 返回：data: { list, total }
   */
  middlewares.use("/api/profile/myActivities", async (req, res) => {
    if (req.method && req.method.toUpperCase() !== "POST") return;

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    const body = await parseJson(req);
    const page = toInt(body.page, 1);
    const pageSize = toInt(body.pageSize, 10);
    const keyword = toStr(body.keyword, "").trim();

    // keyword 过滤（标题 + 主办方 + 地点都支持）
    const filtered = mockActivities.filter((item) => {
      if (!keyword) return true;
      return (
        item.title.includes(keyword) ||
        item.organizer.includes(keyword) ||
        item.location.includes(keyword)
      );
    });

    // 空态（用于测试 Empty）
    if (maybeEmpty(res, { list: [], total: 0 }, "获取成功")) return;

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const list = filtered.slice(start, end);

    sendJson(res, 200, ok({ list, total }, "获取成功"));
  });
}
