// src/mock/modules/activityApply.mock.ts
import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { sendJson, ok, fail, parseJson } from "../core/http";

type ActivityState = 0 | 1 | 2 | 3 | 4;
type MyApplyState = 0 | 1 | 2 | 3 | 4 | 5;
type ActivityType = 0 | 1; // 0: 活动 / 1: 讲座

export interface MockActivityItem {
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
}

export interface MockMyApplicationItem {
  activityId: number;
  username: string;
  state: MyApplyState;
  time: string;
  attachment: string | null;
  checkIn: boolean;
  getScore: boolean;
  type: ActivityType;
  score: number;
  checkOut: boolean;
  activityName: string;
}

type MockDepartment = { id: number; department: string };

const MOCK_USERNAME = "20254227087";

let departments: MockDepartment[] = [
  { id: 1, department: "文体部" },
  { id: 2, department: "学术部" },
  { id: 3, department: "宣传部" },
  { id: 4, department: "社会实践部" },
];

let activities: MockActivityItem[] = [
  {
    id: 1,
    name: "夜跑活动（已报名示例）",
    description: "用于演示：已报名 -> 重复报名会失败",
    department: "文体部",
    time: "2026-02-04 14:57:57",
    signStartTime: "2026-02-04 14:00:00",
    signEndTime: "2026-02-16 14:00:00",
    fullNum: 200,
    score: 20,
    location: "东区操场",
    activityStime: "2026-02-28 08:00:00",
    activityEtime: "2026-03-15 22:00:00",
    type: 0,
    state: 1,
    registeredNum: 1,
    candidateNum: 0,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
  {
    id: 2,
    name: "夜跑活动2（名额已满示例）",
    description: "用于演示：报名人数已满 -> 报名失败",
    department: "文体部",
    time: "2026-02-04 18:49:26",
    signStartTime: "2026-02-04 14:00:00",
    signEndTime: "2026-02-16 14:00:00",
    fullNum: 200,
    score: 20,
    location: "东区操场",
    activityStime: "2026-02-28 08:00:00",
    activityEtime: "2026-03-15 22:00:00",
    type: 0,
    state: 1,
    registeredNum: 200, // ✅ 满
    candidateNum: 5,
    candidateSuccNum: 1,
    candidateFailNum: 0,
  },
  {
    id: 3,
    name: "大模型前沿讲座（可报名成功示例）",
    description: "用于演示：未报名且未满 -> 报名成功 -> 我的报名状态变化",
    department: "学术部",
    time: "2026-02-02 10:20:00",
    signStartTime: "2026-02-03 10:00:00",
    signEndTime: "2026-02-15 10:00:00",
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
  {
    id: 4,
    name: "摄影作品征集（可报名成功示例）",
    description: "用于演示：未报名且未满 -> 报名成功",
    department: "宣传部",
    time: "2026-02-01 09:00:00",
    signStartTime: "2026-02-20 10:00:00",
    signEndTime: "2026-02-25 18:00:00",
    fullNum: 999,
    score: 1,
    location: "线上提交",
    activityStime: "2026-03-01 00:00:00",
    activityEtime: "2026-03-10 23:59:59",
    type: 0,
    state: 0,
    registeredNum: 999, // ✅ 未满（别写满，不然永远失败）
    candidateNum: 0,
    candidateSuccNum: 0,
    candidateFailNum: 0,
  },
];

let myApplications: MockMyApplicationItem[] = [
  {
    activityId: 1,
    username: MOCK_USERNAME,
    state: 0,
    time: "2026-02-01 13:09:13",
    attachment: null,
    checkIn: true,
    getScore: true,
    type: 0,
    score: 20,
    checkOut: false,
    activityName: "夜跑活动（已报名示例）",
  },
];

function nowString() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function findMyApp(activityId: number) {
  return myApplications.find(
    (a) => a.activityId === activityId && a.username === MOCK_USERNAME,
  );
}

function removeMyApp(activityId: number) {
  const idx = myApplications.findIndex(
    (a) => a.activityId === activityId && a.username === MOCK_USERNAME,
  );
  if (idx >= 0) myApplications.splice(idx, 1);
  return idx;
}

/** ✅ 同一套 handler 同时挂到 /api 前缀与非前缀 */
function mountDepartment(middlewares: Connect.Server, base: string) {
  middlewares.use(base, async (req, res: ServerResponse, next) => {
    if (!requireAuth(req, res)) return;
    if (req.method !== "POST") return next();

    if (req.url === "/allDepartment") {
      return sendJson(res, 200, ok(departments));
    }

    next();
  });
}

function mountActivity(middlewares: Connect.Server, base: string) {
  middlewares.use(base, async (req, res: ServerResponse, next) => {
    if (!requireAuth(req, res)) return;
    if (req.method !== "POST") return next();

    const data = await parseJson(req);

    if (req.url === "/searchAll") {
      return sendJson(res, 200, ok(activities));
    }

    if (req.url === "/searchById") {
      const act = activities.find((a) => a.id === Number(data.id));
      if (!act) return sendJson(res, 200, fail("活动不存在", 4001));
      return sendJson(res, 200, ok({ activity: act }));
    }

    if (req.url === "/userApplications") {
      const mine = myApplications.filter((a) => a.username === MOCK_USERNAME);
      return sendJson(res, 200, ok(mine));
    }

    /**
     * ✅ 报名：只判断 “是否重复报名” + “名额是否满”
     */
    if (req.url === "/register") {
      const act = activities.find((a) => a.id === Number(data.id));
      if (!act) return sendJson(res, 200, fail("活动不存在", 4001));

      if (findMyApp(act.id)) {
        return sendJson(
          res,
          200,
          fail("你已报名/候补/审核中，勿重复操作", 4003),
        );
      }

      if (act.registeredNum >= act.fullNum) {
        return sendJson(res, 200, fail("报名人数已满", 4004));
      }

      act.registeredNum += 1;
      myApplications.push({
        activityId: act.id,
        username: MOCK_USERNAME,
        state: 0, // 报名成功
        time: nowString(),
        attachment: null,
        checkIn: false,
        getScore: false,
        type: act.type,
        score: act.score,
        checkOut: false,
        activityName: act.name,
      });

      return sendJson(res, 200, ok("报名成功"));
    }

    /**
     * ✅ 候补：只有满员才能候补（你现在的前端是“失败弹窗里才给候补”，这正好匹配）
     */
    if (req.url === "/candidate") {
      const act = activities.find((a) => a.id === Number(data.id));
      if (!act) return sendJson(res, 200, fail("活动不存在", 4001));

      if (findMyApp(act.id)) {
        return sendJson(
          res,
          200,
          fail("你已报名/候补/审核中，勿重复操作", 4003),
        );
      }

      if (act.registeredNum < act.fullNum) {
        return sendJson(
          res,
          200,
          fail("报名未满，不能候补（请直接报名）", 4007),
        );
      }

      act.candidateNum += 1;
      myApplications.push({
        activityId: act.id,
        username: MOCK_USERNAME,
        state: 1, // 候补中
        time: nowString(),
        attachment: null,
        checkIn: false,
        getScore: false,
        type: act.type,
        score: 0,
        checkOut: false,
        activityName: act.name,
      });

      return sendJson(res, 200, ok("候补成功"));
    }

    /**
     * ✅ 取消：只要存在记录就允许取消，不校验 12h
     */
    if (req.url === "/cancel") {
      const act = activities.find((a) => a.id === Number(data.id));
      if (!act) return sendJson(res, 200, fail("活动不存在", 4001));

      const existed = findMyApp(act.id);
      if (!existed) {
        return sendJson(
          res,
          200,
          fail("你当前没有可取消的报名/候补/审核记录", 4010),
        );
      }

      removeMyApp(act.id);

      // state=0 报名成功：回退 registeredNum；state=1 候补：回退 candidateNum
      if (existed.state === 0)
        act.registeredNum = Math.max(0, act.registeredNum - 1);
      if (existed.state === 1)
        act.candidateNum = Math.max(0, act.candidateNum - 1);

      return sendJson(res, 200, ok("取消成功"));
    }

    next();
  });
}

export function setupActivityApplyMock(middlewares: Connect.Server) {
  mountDepartment(middlewares, "/department");
  mountDepartment(middlewares, "/api/department");

  mountActivity(middlewares, "/activity");
  mountActivity(middlewares, "/api/activity");
}
