// src/mock/modules/profile.mock.ts
/**
 * Profile Mock
 *
 * 模拟接口：
 * 1) POST /user/info
 *    - 用于个人中心「我的信息」
 *    - 返回格式严格对齐你给的接口文档
 *
 * 2) POST /profile/myActivities
 *    - 用于个人中心「我的活动 / 讲座列表」
 *    - 当前后端未实现，完全由前端 mock
 *
 * 设计目标：
 * - mock ≈ 真接口（字段名、层级、语义都尽量贴近）
 * - 后端上线后，只需要删除/关闭 mock，不用改页面
 */

import type { Connect } from "vite";
import type { ApiResponse } from "../../shared/http/types";

/** -----------------------------
 * 工具函数
 * ----------------------------- */
function ok<T>(data: T): ApiResponse<T> {
  return {
    code: 200,
    msg: "获取成功",
    data,
    timestamp: Date.now(),
  };
}

/** -----------------------------
 * Mock 数据：用户信息
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
 * ----------------------------- */
const mockActivities = [
  {
    id: 101,
    title: "金穗讲堂：就业与职业规划分享",
    category: "lecture",
    status: "signed",
    timeRange: "2026-02-08 19:00-21:00",
    location: "天赐庄校区 · 逸夫楼 201",
    organizer: "计算机学院研究生会",
    serviceScoreGain: 0,
    createdAt: "2026-02-01 12:00:30",
  },
  {
    id: 102,
    title: "志愿服务：校园环境整治活动",
    category: "activity",
    status: "attended",
    timeRange: "2026-02-10 09:00-11:30",
    location: "天赐庄校区 · 东门集合",
    organizer: "校团委",
    serviceScoreGain: 2,
    createdAt: "2026-02-02 09:12:11",
  },
];

/** -----------------------------
 * 注册 Mock 路由
 * ----------------------------- */
export function setupProfileMock(middlewares: Connect.Server) {
  /**
   * POST /user/info
   * 模拟真实接口：获取用户信息
   */
  middlewares.use("/api/user/info", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        ok({
          user: mockUser,
          token: "mock-token-profile",
        }),
      ),
    );
  });

  /**
   * POST /profile/myActivities
   * 模拟：个人中心的活动 / 讲座列表
   */
  middlewares.use("/api/profile/myActivities", async (req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const parsed = body ? JSON.parse(body) : {};
      const page = Number(parsed.page ?? 1);
      const pageSize = Number(parsed.pageSize ?? 10);
      const keyword = String(parsed.keyword ?? "");

      // 简单 keyword 过滤（标题）
      const filtered = mockActivities.filter((item) =>
        keyword ? item.title.includes(keyword) : true,
      );

      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify(
          ok({
            list: filtered.slice(start, end),
            total: filtered.length,
          }),
        ),
      );
    });
  });
}
