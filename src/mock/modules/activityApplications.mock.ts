// src/mock/modules/activityApplications.mock.ts

/**
 * Activity Applications Mock
 *
 * 覆盖接口：
 * - POST /api/activity/activityRegisters
 * - POST /api/activity/activityCandidates
 * - POST /api/activity/activitySupplements
 * - POST /api/activity/examineSupplement
 *
 * 设计目标：
 * - 三个列表共用同一份“内存申请库”
 * - 根据 state 区分：
 *    0/2 -> 报名成功/候补成功（Registers）
 *    1/3 -> 候补中/候补失败（Candidates）
 *    4/5 -> 审核中/审核失败（Supplements）
 * - examineSupplement 会真实修改 state
 * - 写接口不做故障注入（避免超时）
 */

import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { ok, fail, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail } from "../core/faults";

type ApplicationState = 0 | 1 | 2 | 3 | 4 | 5;
type ActivityType = 0 | 1;

type MockApplicationItem = {
  activityId: number;
  username: string;
  name: string;
  state: ApplicationState;
  time: string;
  attachment: string | null;
  checkIn: boolean;
  checkOut: boolean;
  getScore: boolean;
  type: ActivityType;
  score: number;
};

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function toNumber(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}

function toStr(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * 内存“数据库”
 * 实际项目中可根据 activityId 过滤
 */
let applicationStore: MockApplicationItem[] = [
  // 报名成功
  {
    activityId: 1,
    username: "20244227087",
    name: "梁靖松",
    state: 0,
    time: nowStr(),
    attachment: null,
    checkIn: false,
    checkOut: false,
    getScore: true,
    type: 0,
    score: 20,
  },
  // 候补中
  {
    activityId: 1,
    username: "20254227033",
    name: "徐鹏飞",
    state: 1,
    time: nowStr(),
    attachment: null,
    checkIn: false,
    checkOut: false,
    getScore: true,
    type: 0,
    score: 20,
  },
  // 补报名（审核中）
  {
    activityId: 1,
    username: "20234227011",
    name: "王同学",
    state: 4,
    time: nowStr(),
    attachment: "https://example.com/demo.pdf", // 可直接访问
    checkIn: false,
    checkOut: false,
    getScore: false,
    type: 0,
    score: 0,
  },
];

function safe500(res: ServerResponse, err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "mock 内部错误";
  sendJson(res, 500, fail(msg, 500));
}

function filterByActivityId(activityId: number) {
  return applicationStore.filter((a) => a.activityId === activityId);
}

export function setupActivityApplicationsMock(
  middlewares: Connect.Server,
): void {
  /**
   * 报名人员
   */
  middlewares.use("/api/activity/activityRegisters", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      await withDelay();
      if (maybeFail(res as ServerResponse)) return;
      if (!requireAuth(req, res as ServerResponse)) return;

      const body = await parseJson(req);
      const activityId = toNumber(body?.activityId);

      if (!Number.isFinite(activityId)) {
        sendJson(res as ServerResponse, 400, fail("activityId 无效", 400));
        return;
      }

      const list = filterByActivityId(activityId).filter((a) =>
        [0, 2].includes(a.state),
      );

      sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 候补人员
   */
  middlewares.use(
    "/api/activity/activityCandidates",
    async (req, res, next) => {
      if (req.method !== "POST") return next();

      try {
        await withDelay();
        if (maybeFail(res as ServerResponse)) return;
        if (!requireAuth(req, res as ServerResponse)) return;

        const body = await parseJson(req);
        const activityId = toNumber(body?.activityId);

        if (!Number.isFinite(activityId)) {
          sendJson(res as ServerResponse, 400, fail("activityId 无效", 400));
          return;
        }

        const list = filterByActivityId(activityId).filter((a) =>
          [1, 3].includes(a.state),
        );

        sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
      } catch (e) {
        safe500(res as ServerResponse, e);
      }
    },
  );

  /**
   * 补报名人员
   */
  middlewares.use(
    "/api/activity/activitySupplements",
    async (req, res, next) => {
      if (req.method !== "POST") return next();

      try {
        await withDelay();
        if (maybeFail(res as ServerResponse)) return;
        if (!requireAuth(req, res as ServerResponse)) return;

        const body = await parseJson(req);
        const activityId = toNumber(body?.activityId);

        if (!Number.isFinite(activityId)) {
          sendJson(res as ServerResponse, 400, fail("activityId 无效", 400));
          return;
        }

        const list = filterByActivityId(activityId).filter((a) =>
          [4, 5].includes(a.state),
        );

        sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
      } catch (e) {
        safe500(res as ServerResponse, e);
      }
    },
  );

  /**
   * 审核补报名
   */
  middlewares.use("/api/activity/examineSupplement", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      const body = await parseJson(req);
      const activityId = toNumber(body?.activityId);
      const username = toStr(body?.username);
      const view = toNumber(body?.view);

      if (!Number.isFinite(activityId) || !username || ![0, 5].includes(view)) {
        sendJson(res as ServerResponse, 400, fail("参数无效", 400));
        return;
      }

      const item = applicationStore.find(
        (a) => a.activityId === activityId && a.username === username,
      );

      if (!item) {
        sendJson(res as ServerResponse, 404, fail("记录不存在", 404));
        return;
      }

      // 通过 -> 变为报名成功
      if (view === 0) {
        item.state = 0;
      }

      // 不通过 -> 审核失败
      if (view === 5) {
        item.state = 5;
      }

      sendJson(res as ServerResponse, 200, ok(null, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });
}
