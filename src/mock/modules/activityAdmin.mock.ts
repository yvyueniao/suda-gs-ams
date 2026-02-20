// src/mock/modules/activityAdmin.mock.ts
import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { ok, fail, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";

/**
 * Activity Admin Mock
 *
 * 对齐后端接口：
 * - POST /activity/ownActivity
 * - POST /activity/create
 * - POST /activity/updateActivityInfo
 * - POST /activity/delete
 * - POST /activity/searchById
 *
 * 关键要求：
 * - ✅ create 后真实写入内存列表
 * - ✅ update 后真实更新内存对象
 * - ✅ delete 后真实从内存列表移除
 *
 * 关键修复（解决：超时 / id 无效 / name 为空）：
 * - ✅ 所有“需要 body 的接口”第一时间 parseJson(req)（和 orgDepartment.mock 一样）
 * - ✅ 写接口（create/update/delete/searchById）不做故障注入（不 withDelay/maybeFail/maybeEmpty）
 * - ✅ 每个 handler 都 try/catch，catch 必回包（否则 axios 超时）
 */

type ActivityType = 0 | 1;
type ActivityState = 0 | 1 | 2 | 3 | 4;

type MockActivityItem = {
  id: number;
  name: string;
  description: string;
  department: string;
  time: string;

  signStartTime: string;
  signEndTime: string;

  fullNum: number;
  score: number;
  location: string;

  activityStime: string;
  activityEtime: string;

  type: ActivityType;
  state: ActivityState;

  registeredNum: number;
  candidateNum: number;
  candidateSuccNum: number;
  candidateFailNum: number;
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

function parseTimeMs(s: string) {
  const ms = Date.parse(s.replace(" ", "T"));
  return Number.isFinite(ms) ? ms : 0;
}

function calcState(
  a: Pick<
    MockActivityItem,
    "signStartTime" | "signEndTime" | "activityStime" | "activityEtime"
  >,
): ActivityState {
  const now = Date.now();
  const ss = parseTimeMs(a.signStartTime);
  const se = parseTimeMs(a.signEndTime);
  const as = parseTimeMs(a.activityStime);
  const ae = parseTimeMs(a.activityEtime);

  if (now < ss) return 0;
  if (now >= ss && now < se) return 1;
  if (now >= se && now < as) return 2;
  if (now >= as && now < ae) return 3;
  return 4;
}

// ✅ 内存数据库
let seq = 1000;
let activityStore: MockActivityItem[] = [
  {
    id: 1,
    name: "夜跑活动",
    description: "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
    department: "文体部",
    time: nowStr(),
    signStartTime: "2026-02-01 10:00:00",
    signEndTime: "2026-02-04 10:00:00",
    fullNum: 100,
    score: 3,
    location: "东区操场",
    activityStime: "2026-02-04 20:00:00",
    activityEtime: "2026-02-04 21:00:00",
    type: 0,
    state: 1,
    registeredNum: 12,
    candidateNum: 1,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
  {
    id: 2,
    name: "夜跑活动2",
    description: "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
    department: "文体部",
    time: nowStr(),
    signStartTime: "2026-02-01 10:00:00",
    signEndTime: "2026-02-04 10:00:00",
    fullNum: 100,
    score: 3,
    location: "东区操场",
    activityStime: "2026-02-04 20:00:00",
    activityEtime: "2026-02-04 21:00:00",
    type: 1,
    state: 1,
    registeredNum: 12,
    candidateNum: 1,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
];

function findById(id: number) {
  return activityStore.find((a) => a.id === id);
}

function safe500(res: ServerResponse, err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "mock 内部错误";
  sendJson(res, 500, fail(msg, 500));
}

export function setupActivityAdminMock(middlewares: Connect.Server): void {
  /**
   * 获取我能管理的活动/讲座
   * POST /api/activity/ownActivity
   *
   * （读接口：可以保留故障注入）
   */
  middlewares.use("/api/activity/ownActivity", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      await withDelay();
      if (maybeFail(res as ServerResponse)) return;
      if (!requireAuth(req, res as ServerResponse)) return;
      if (maybeEmpty(res as ServerResponse, [], "操作成功")) return;

      const list = activityStore.map((a) => ({ ...a, state: calcState(a) }));
      sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 创建活动/讲座
   * POST /api/activity/create
   */
  middlewares.use("/api/activity/create", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      // ✅ 第一时间读 body（照 orgDepartment.mock）
      const body = (await parseJson(req)) as Partial<MockActivityItem>;

      const name = toStr(body?.name);
      if (!name) {
        sendJson(res as ServerResponse, 400, fail("name 不能为空", 400));
        return;
      }

      const signStartTime = toStr(body?.signStartTime);
      const signEndTime = toStr(body?.signEndTime);
      const activityStime = toStr(body?.activityStime);
      const activityEtime = toStr(body?.activityEtime);

      if (!signStartTime || !signEndTime || !activityStime || !activityEtime) {
        sendJson(res as ServerResponse, 400, fail("时间字段不完整", 400));
        return;
      }

      const fullNum = toNumber(body?.fullNum);
      const score = toNumber(body?.score);
      const type = toNumber(body?.type);

      if (!Number.isFinite(fullNum) || fullNum < 0) {
        sendJson(res as ServerResponse, 400, fail("fullNum 无效", 400));
        return;
      }
      if (!Number.isFinite(score)) {
        sendJson(res as ServerResponse, 400, fail("score 无效", 400));
        return;
      }
      if (!(type === 0 || type === 1)) {
        sendJson(res as ServerResponse, 400, fail("type 无效", 400));
        return;
      }

      const item: MockActivityItem = {
        id: seq++,
        name,
        description: toStr(body?.description),
        department: toStr(body?.department) || "文体部",
        time: nowStr(),

        signStartTime,
        signEndTime,

        fullNum,
        score,
        location: toStr(body?.location),

        activityStime,
        activityEtime,

        type: type as ActivityType,
        state: calcState({
          signStartTime,
          signEndTime,
          activityStime,
          activityEtime,
        }),

        registeredNum: 0,
        candidateNum: 0,
        candidateSuccNum: 0,
        candidateFailNum: 0,
      };

      activityStore = [item, ...activityStore];

      sendJson(res as ServerResponse, 200, ok("成功添加1条数据", "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 修改活动/讲座信息
   * POST /api/activity/updateActivityInfo
   */
  middlewares.use(
    "/api/activity/updateActivityInfo",
    async (req, res, next) => {
      if (req.method !== "POST") return next();

      try {
        if (!requireAuth(req, res as ServerResponse)) return;

        // ✅ 第一时间读 body
        const body = (await parseJson(req)) as Partial<MockActivityItem> & {
          id?: unknown;
        };

        const id = toNumber(body?.id);
        if (!Number.isFinite(id)) {
          sendJson(res as ServerResponse, 400, fail("id 无效", 400));
          return;
        }

        const item = findById(id);
        if (!item) {
          sendJson(res as ServerResponse, 404, fail("活动不存在", 404));
          return;
        }

        // 只更新传入字段（不允许改 id/time）
        const patch: Partial<MockActivityItem> = { ...body };
        delete (patch as any).id;
        delete (patch as any).time;

        Object.assign(item, patch);
        item.state = calcState(item);

        sendJson(res as ServerResponse, 200, ok(null, "操作成功"));
      } catch (e) {
        safe500(res as ServerResponse, e);
      }
    },
  );

  /**
   * 删除活动/讲座
   * POST /api/activity/delete
   */
  middlewares.use("/api/activity/delete", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      // ✅ 第一时间读 body
      const body = (await parseJson(req)) as { id?: unknown };
      const id = toNumber(body?.id);

      if (!Number.isFinite(id)) {
        sendJson(res as ServerResponse, 400, fail("id 无效", 400));
        return;
      }

      const before = activityStore.length;
      activityStore = activityStore.filter((a) => a.id !== id);

      if (activityStore.length === before) {
        sendJson(res as ServerResponse, 404, fail("活动不存在", 404));
        return;
      }

      sendJson(res as ServerResponse, 200, ok("成功删除1条数据", "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 按 ID 查找活动/讲座详情
   * POST /api/activity/searchById
   */
  middlewares.use("/api/activity/searchById", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      // ✅ 第一时间读 body
      const body = (await parseJson(req)) as { id?: unknown };
      const id = toNumber(body?.id);

      if (!Number.isFinite(id)) {
        sendJson(res as ServerResponse, 400, fail("id 无效", 400));
        return;
      }

      const item = findById(id);
      if (!item) {
        sendJson(res as ServerResponse, 404, fail("活动不存在", 404));
        return;
      }

      sendJson(
        res as ServerResponse,
        200,
        ok({ activity: { ...item, state: calcState(item) } }, "操作成功"),
      );
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });
}
