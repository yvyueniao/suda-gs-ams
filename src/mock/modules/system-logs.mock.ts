// src/mock/modules/system-logs.mock.ts

/**
 * System Logs Mock
 *
 * 模拟接口：
 * POST /lll2lll5loo8og7gs3ss3plog01
 *
 * 支持：
 * - pageNum（从 1 开始）
 * - pageSize
 *
 * 返回（对齐你最新截图）：
 * {
 *   code: 200,
 *   msg: "操作成功",
 *   data: {
 *     total: number,
 *     logs: SystemLogItem[]
 *   },
 *   timestamp: number
 * }
 */

import type { Connect } from "vite";

type SystemLogItem = {
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
  "/session/allFeedback",
  "/session/content",
  "/activity/upload",
];

const USERS = [
  { username: "20254227087", name: "徐鹏飞" },
  { username: "20224227087", name: "张三" },
  { username: "20234227087", name: "李四" },
  { username: "20244227087", name: "王五" },
];

const ADDRESSES = [
  "中国|0|江苏省|苏州市|电信|0",
  "中国|0|湖南省|长沙市|移动|0",
  "中国|0|浙江省|杭州市|联通|0",
  "美国|0|华盛顿|西雅图|0",
  "未知",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function randomIP() {
  // 模拟常见公网 IP
  return `${rand(1, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function randomTime(offsetMinutes: number) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
  return formatTime(d);
}

function genContent(path: string, i: number) {
  // 让 content 更像你后端截图里的 “json 字符串”
  if (path === "/session/allFeedback") return "[null Or file upload]";
  if (path === "/activity/upload")
    return JSON.stringify(
      { sessionId: "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f", content: "你好" },
      null,
      2,
    );
  if (path === "/activity/special")
    return JSON.stringify(
      { username: "20254227087", type: 1, score: rand(1, 10) },
      null,
      2,
    );
  if (path === "/user/inforUsername")
    return JSON.stringify({ username: `20254227${pad2(i % 100)}` }, null, 2);

  return JSON.stringify(
    {
      exampleParam: rand(1, 100),
      traceId: `${Date.now().toString(16).slice(-6)}${rand(100, 999)}`,
    },
    null,
    2,
  );
}

function generateMockData(count = 300): SystemLogItem[] {
  const list: SystemLogItem[] = [];

  for (let i = 0; i < count; i++) {
    const user = randomItem(USERS);
    const path = randomItem(PATHS);

    list.push({
      username: user.username,
      name: user.name,
      path,
      content: genContent(path, i),
      time: randomTime(i * 3), // 每条间隔 3 分钟
      ip: randomIP(),
      address: randomItem(ADDRESSES),
    });
  }

  // 按时间倒序（最新在前）
  list.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));

  return list;
}

const MOCK_DATA = generateMockData(300);

/** 兼容读取 body（不依赖你们 core/parseJson，避免引入额外依赖） */
function readJsonBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += String(chunk)));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function setupSystemLogsMock(middlewares: Connect.Server) {
  middlewares.use(
    "/api/lll2lll5loo8og7gs3ss3plog01",
    async (req, res, next) => {
      if (req.method && req.method.toUpperCase() !== "POST") return next();

      const body = await readJsonBody(req);

      const pageNum = Math.max(1, Number(body?.pageNum ?? 1) || 1);
      const pageSize = Math.max(1, Number(body?.pageSize ?? 10) || 10);

      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;

      const pageList = MOCK_DATA.slice(start, end);

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          code: 200,
          msg: "操作成功",
          data: {
            total: MOCK_DATA.length,
            logs: pageList,
          },
          timestamp: Date.now(),
        }),
      );
    },
  );
}
