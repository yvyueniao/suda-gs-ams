// src/mock/modules/system-logs.mock.ts

/**
 * System Logs Mock
 *
 * 模拟接口：
 * POST /lll2lll5loo8og7gs3ss3plog01
 *
 * 支持：
 * - pageNum
 * - pageSize
 *
 * 返回：
 * {
 *   list: SystemLogItem[],
 *   total: number
 * }
 */

import type { Connect } from "vite";
import { randomUUID } from "crypto";

type SystemLogItem = {
  id: string;
  username: string;
  name: string;
  path: string;
  content: string;
  time: string;
  ip: string;
  address: string;
};

const PATHS = [
  "/user/inforUsername",
  "/activity/special",
  "/activity/create",
  "/department/create",
  "/department/delete",
  "/session/createFeedback",
  "/session/upload",
];

const USERS = [
  { username: "20254227087", name: "徐鹏飞" },
  { username: "20224227087", name: "张三" },
  { username: "20234227087", name: "李四" },
  { username: "20244227087", name: "王五" },
];

const ADDRESSES = [
  "中国|江苏省|苏州市",
  "中国|湖南省|长沙市",
  "中国|浙江省|杭州市",
  "未知",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP() {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime(offsetMinutes: number) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function generateMockData(count = 200): SystemLogItem[] {
  const list: SystemLogItem[] = [];

  for (let i = 0; i < count; i++) {
    const user = randomItem(USERS);
    const path = randomItem(PATHS);

    list.push({
      id: randomUUID(),
      username: user.username,
      name: user.name,
      path,
      content: JSON.stringify(
        {
          exampleParam: rand(1, 100),
          traceId: randomUUID().slice(0, 8),
        },
        null,
        2,
      ),
      time: randomTime(i * 3), // 每条间隔 3 分钟
      ip: randomIP(),
      address: randomItem(ADDRESSES),
    });
  }

  // 按时间倒序（最新在前）
  return list.sort((a, b) => (a.time < b.time ? 1 : -1));
}

const MOCK_DATA = generateMockData(300);

export function setupSystemLogsMock(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    if (
      req.method === "POST" &&
      req.url === "/api/lll2lll5loo8og7gs3ss3plog01"
    ) {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        const { pageNum = 1, pageSize = 10 } = body ? JSON.parse(body) : {};

        const start = (pageNum - 1) * pageSize;
        const end = start + pageSize;

        const pageList = MOCK_DATA.slice(start, end);

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            code: 200,
            msg: "操作成功",
            data: {
              list: pageList,
              total: MOCK_DATA.length,
            },
            timestamp: Date.now(),
          }),
        );
      });

      return;
    }

    next();
  });
}
