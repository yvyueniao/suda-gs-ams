// src/mock/modules/feedback.mock.ts
import type { Connect } from "vite";
import type { ServerResponse } from "http";

import { requireAuth } from "../core/auth";
import { ok, fail, sendJson, parseJson } from "../core/http";
import { withDelay, maybeFail, maybeEmpty } from "../core/faults";

/**
 * Feedback Mock
 *
 * 对齐后端接口：
 * - POST /session/myFeedbacks        （普通用户：我的反馈列表，不带 name）
 * - POST /session/allFeedback        （管理员：全部反馈列表，带 name + username）
 * - POST /session/createFeedback     （创建反馈）
 * - POST /session/close              （结束反馈：state -> 2）
 * - POST /session/content            （反馈详情聊天内容：带 name）
 * - POST /activity/upload            （发送消息：form-data，写入内存列表，立即可见）
 *
 * 关键要求：
 * - ✅ createFeedback 后真实写入内存 sessions
 * - ✅ upload 后真实写入内存 messageStore，并能立刻在详情页看到
 * - ✅ close 后更新 state，且 state=2 时禁止继续对话
 *
 * 风格对齐（参考 activityAdmin.mock.ts）：
 * - 读接口可 withDelay/maybeFail/maybeEmpty
 * - 写接口（create/close/upload）不做故障注入
 * - 每个 handler try/catch，catch 必回包（避免 axios 超时）
 */

/** 反馈处理进度 */
type FeedbackState = 0 | 1 | 2;
/** 聊天消息类型：0=反馈用户，1=系统人员 */
type FeedbackMessageType = 0 | 1;

type FeedbackSession = {
  username: string;
  name: string; // allFeedback 返回；myFeedbacks 不返回，但内存里仍保存
  sessionId: string;
  title: string;
  time: string;
  state: FeedbackState;
};

type FeedbackMessage = {
  sessionId: string;
  content: string;
  fileUrl: string | null;
  time: string;
  username: string;
  name: string; // ✅ 你确认：聊天里用 name
  type: FeedbackMessageType;
};

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function toStr(v: unknown) {
  return String(v ?? "").trim();
}

/** mock 用 sessionId */
function genSessionId() {
  const rnd = Math.random().toString(16).slice(2);
  return `${Date.now().toString(16)}-${rnd}`;
}

/**
 * ✅ mock 中拿“当前登录用户”
 *
 * 你们 requireAuth(req,res) 只返回 boolean，不返回 user。
 * 这里用 Authorization 做一个“弱推断”：
 * - token 里包含 "admin" / "role0" 之类 → 当管理员
 * - 否则 → 普通用户
 *
 * （只用于 mock 行为分流，不影响真实后端）
 */
function getMockUser(req: Connect.IncomingMessage) {
  const auth = String(req.headers.authorization ?? "").toLowerCase();

  if (auth.includes("admin") || auth.includes("role0")) {
    return { username: "20224227087", name: "管理员", role: 0 as const };
  }

  return { username: "20254227087", name: "李四", role: 4 as const };
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

/** ✅ 内存数据库 */
let sessions: FeedbackSession[] = [
  {
    username: "20254227087",
    name: "李四",
    sessionId: "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f",
    title: "社会活动分数出错问题",
    time: "2026-02-20 17:52:56",
    state: 0,
  },
];

let messageStore: Record<string, FeedbackMessage[]> = {
  "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f": [
    {
      sessionId: "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f",
      content: "你好",
      fileUrl: null,
      time: "2026-02-20 19:21:25",
      username: "20254227087",
      name: "李四",
      type: 0,
    },
    {
      sessionId: "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f",
      content:
        "你好，你的问题已受理，正在解决，如果需要其他补充材料会回复给你，注意查看",
      fileUrl: null,
      time: "2026-02-20 19:35:25",
      username: "20224227087",
      name: "管理员",
      type: 1,
    },
  ],
};

// ===============================
// ✅ 自动扩充 sessions 到 200 条
// ✅ 将唯一对话 sessionId=0c4f... 的消息扩充到 50 条
// - 稳定可复现：固定 seed
// ===============================

/** 简单可复现随机数（LCG） */
function createRng(seed = 20260225) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmt(dt: Date) {
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const d = pad2(dt.getDate());
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());
  const ss = pad2(dt.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

const FIXED_SESSION_ID = "0c4fb6eb-1e71-414d-ac39-e6e8bcabd40f";

function seedSessionsTo(target = 200) {
  const rng = createRng(20260225);

  const familyNames = [
    "赵",
    "钱",
    "孙",
    "李",
    "周",
    "吴",
    "郑",
    "王",
    "冯",
    "陈",
    "褚",
    "卫",
    "蒋",
    "沈",
    "韩",
    "杨",
    "朱",
    "秦",
    "尤",
    "许",
    "何",
    "吕",
    "施",
    "张",
  ];
  const givenNames = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "子涵",
    "雨桐",
    "浩然",
    "梓轩",
    "欣怡",
    "佳宁",
    "宇航",
    "明哲",
    "思远",
    "若曦",
    "晨曦",
    "子墨",
    "亦辰",
    "可欣",
  ];

  const titles = [
    "活动报名提示失败",
    "讲座次数未更新",
    "社会活动分数显示异常",
    "权限菜单缺失",
    "个人信息无法保存",
    "上传附件失败",
    "表格筛选无效",
    "导出数据不完整",
    "登录后跳转异常",
    "页面白屏/加载慢",
    "系统提示与实际不符",
    "反馈结束按钮不可用",
    "手机号/邮箱格式校验问题",
    "账号状态显示错误",
    "角色任命后未生效",
  ];

  // 生成时间：2026-02-01 ~ 2026-02-25
  const base = new Date("2026-02-01T08:00:00");
  const sessionIdSet = new Set(sessions.map((s) => s.sessionId));

  let seq = 100; // 用于生成 username
  while (sessions.length < target) {
    const username = `2025${pad2(42)}227${String(seq).padStart(3, "0")}`; // 类似 20254227xxx
    seq += 1;

    const name = `${pick(rng, familyNames)}${pick(rng, givenNames)}`;
    const title = pick(rng, titles);

    const dayOff = clampInt(rng() * 25, 0, 24);
    const minOff = clampInt(rng() * 24 * 60, 0, 1439);
    const dt = new Date(base);
    dt.setDate(dt.getDate() + dayOff);
    dt.setMinutes(dt.getMinutes() + minOff);

    const state: FeedbackState = rng() < 0.55 ? 0 : rng() < 0.82 ? 1 : 2;

    // 生成不冲突的 sessionId（确保不会覆盖固定那条）
    let sid = genSessionId();
    while (sid === FIXED_SESSION_ID || sessionIdSet.has(sid)) {
      sid = genSessionId();
    }
    sessionIdSet.add(sid);

    sessions.push({
      username,
      name,
      sessionId: sid,
      title,
      time: fmt(dt),
      state,
    });

    // 初始化消息列表（少量即可；重点是固定 session 扩到 50）
    if (!messageStore[sid]) messageStore[sid] = [];
    if (rng() < 0.25) {
      const mDt = new Date(dt);
      mDt.setMinutes(mDt.getMinutes() + clampInt(rng() * 180, 1, 180));
      messageStore[sid].push({
        sessionId: sid,
        content: "我这边遇到了一点问题，麻烦帮忙看下。",
        fileUrl: null,
        time: fmt(mDt),
        username,
        name,
        type: 0,
      });
    }
  }
}

function seedFixedSessionMessagesTo(target = 50) {
  const rng = createRng(20260226);

  const user = { username: "20254227087", name: "李四" };
  const admin = { username: "20224227087", name: "管理员" };

  const userTexts = [
    "我这边发现社会活动分数不对。",
    "我昨天参加了活动，但分数没有加上。",
    "能帮我核对一下记录吗？",
    "我这边截图已经准备好了。",
    "活动名称是金穗讲堂那场。",
    "我刷新页面后还是一样。",
    "是不是需要重新登录？",
    "我用手机端也看过了。",
    "我的学号是 20254227087。",
    "辛苦老师帮忙处理一下。",
  ];

  const adminTexts = [
    "收到，我们先核对一下活动记录。",
    "请补充一下活动时间或活动ID。",
    "我们这边看到记录了，正在核查分数规则。",
    "可能是同步延迟，我再帮你触发一次刷新。",
    "已记录该问题，会尽快修复。",
    "你可以先尝试退出重新登录看看。",
    "如果方便请上传截图或相关证明材料。",
    "目前已定位到原因，正在发布修复。",
    "修复后我们会回你一条消息，请留意。",
    "已处理完成，你再刷新页面确认一下。",
  ];

  if (!messageStore[FIXED_SESSION_ID]) {
    messageStore[FIXED_SESSION_ID] = [];
  }

  const list = messageStore[FIXED_SESSION_ID];

  // 基准时间从最后一条消息往后递增
  let start = new Date("2026-02-20T19:35:25");
  if (list.length > 0) {
    const lastTime = list[list.length - 1]?.time;
    if (lastTime) {
      const t = new Date(lastTime.replace(" ", "T"));
      if (!Number.isNaN(t.getTime())) start = t;
    }
  }

  // 补到 50 条：交替用户/管理员，时间递增
  let i = list.length;
  while (i < target) {
    const isUser = i % 2 === 0; // 让节奏更像对话
    const addMin = clampInt(rng() * 25, 3, 25);
    start = new Date(start.getTime() + addMin * 60 * 1000);

    const msg: FeedbackMessage = {
      sessionId: FIXED_SESSION_ID,
      content: isUser ? pick(rng, userTexts) : pick(rng, adminTexts),
      fileUrl: null,
      time: fmt(start),
      username: isUser ? user.username : admin.username,
      name: isUser ? user.name : admin.name,
      type: isUser ? 0 : 1,
    };

    // 偶尔给用户消息附一个“看起来像”附件 URL（不落盘，只为了 UI）
    if (isUser && rng() < 0.12) {
      msg.fileUrl = `http://localhost:8088/mock-upload/${encodeURIComponent(
        `截图_${pad2(clampInt(rng() * 99, 1, 99))}.pdf`,
      )}`;
      msg.content = `${msg.content}（已附截图）`;
    }

    list.push(msg);
    i += 1;
  }
}

// ✅ 执行扩充
seedSessionsTo(200);
seedFixedSessionMessagesTo(50);

function findSession(sessionId: string) {
  return sessions.find((s) => s.sessionId === sessionId);
}

export function setupFeedbackMock(middlewares: Connect.Server): void {
  /**
   * 我的反馈（普通用户）
   * POST /api/session/myFeedbacks
   * ✅ 不返回 name
   */
  middlewares.use("/api/session/myFeedbacks", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      await withDelay();
      if (maybeFail(res as ServerResponse)) return;
      if (!requireAuth(req, res as ServerResponse)) return;

      const me = getMockUser(req);

      const list = sessions
        .filter((s) => s.username === me.username)
        .map((s) => ({
          username: s.username, // 你要 username：保留
          sessionId: s.sessionId,
          title: s.title,
          time: s.time,
          state: s.state,
        }));

      if (maybeEmpty(res as ServerResponse, list, "操作成功")) return;

      sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 全部反馈（管理员）
   * POST /api/session/allFeedback
   * ✅ 返回 name + username
   */
  middlewares.use("/api/session/allFeedback", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      await withDelay();
      if (maybeFail(res as ServerResponse)) return;
      if (!requireAuth(req, res as ServerResponse)) return;

      const list = sessions.map((s) => ({
        username: s.username,
        name: s.name,
        sessionId: s.sessionId,
        title: s.title,
        time: s.time,
        state: s.state,
      }));

      if (maybeEmpty(res as ServerResponse, list, "操作成功")) return;

      sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 创建反馈
   * POST /api/session/createFeedback
   * body: { title: string }
   * ✅ 写入 sessions + 初始化 messageStore
   */
  middlewares.use("/api/session/createFeedback", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      const me = getMockUser(req);
      const body = (await parseJson(req)) as any;

      const title = toStr(body?.title);
      if (!title) {
        sendJson(res as ServerResponse, 400, fail("title 不能为空", 400));
        return;
      }

      const sessionId = genSessionId();
      const created: FeedbackSession = {
        username: me.username,
        name: me.name,
        sessionId,
        title,
        time: nowStr(),
        state: 0,
      };

      sessions = [created, ...sessions];
      messageStore[sessionId] = [];

      sendJson(res as ServerResponse, 200, ok("成功创建1条反馈", "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 结束反馈（管理员）
   * POST /api/session/close
   * body: { sessionId: string }
   * ✅ state -> 2
   */
  middlewares.use("/api/session/close", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      const body = (await parseJson(req)) as any;
      const sessionId = toStr(body?.sessionId);

      if (!sessionId) {
        sendJson(res as ServerResponse, 400, fail("sessionId 不能为空", 400));
        return;
      }

      const s = findSession(sessionId);
      if (!s) {
        sendJson(res as ServerResponse, 404, fail("反馈不存在", 404));
        return;
      }

      s.state = 2;

      sendJson(res as ServerResponse, 200, ok("成功关闭1条反馈", "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 查看反馈聊天内容
   * POST /api/session/content
   * body: { sessionId: string }
   * ✅ 返回 messages（每条带 name）
   */
  middlewares.use("/api/session/content", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      await withDelay();
      if (maybeFail(res as ServerResponse)) return;
      if (!requireAuth(req, res as ServerResponse)) return;

      const body = (await parseJson(req)) as any;
      const sessionId = toStr(body?.sessionId);

      if (!sessionId) {
        sendJson(res as ServerResponse, 400, fail("sessionId 不能为空", 400));
        return;
      }

      const s = findSession(sessionId);
      if (!s) {
        sendJson(res as ServerResponse, 404, fail("反馈不存在", 404));
        return;
      }

      const list = messageStore[sessionId] ?? [];
      if (maybeEmpty(res as ServerResponse, list, "操作成功")) return;

      sendJson(res as ServerResponse, 200, ok(list, "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });

  /**
   * 发送消息（文本 + 可选附件）
   * POST /api/activity/upload
   *
   * 后端是 form-data：
   * - sessionId: string
   * - content:   string
   * - file:      File (optional)
   *
   * ✅ 写入 messageStore[sessionId]，保证“发送后立刻能看到”
   * ✅ state=2 时禁止发送
   */
  middlewares.use("/api/activity/upload", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      if (!requireAuth(req, res as ServerResponse)) return;

      const me = getMockUser(req);

      /**
       * ⚠️ 说明：
       * 你们项目里 parseJson(req) 在其它模块也被用于“上传”类接口（你发过类似实现），
       * 所以这里沿用 parseJson，不引入新的 multipart 解析器。
       */
      const body = (await parseJson(req)) as any;

      // ✅ 兼容：sessionId（正确） + sessionID（某些前端/表单库会大写）
      const sessionId = toStr(body?.sessionId || body?.sessionID);
      const content = toStr(body?.content);

      if (!sessionId) {
        sendJson(res as ServerResponse, 400, fail("sessionId 不能为空", 400));
        return;
      }
      if (!content) {
        sendJson(res as ServerResponse, 400, fail("content 不能为空", 400));
        return;
      }

      const s = findSession(sessionId);
      if (!s) {
        sendJson(res as ServerResponse, 404, fail("反馈不存在", 404));
        return;
      }

      if (s.state === 2) {
        sendJson(
          res as ServerResponse,
          400,
          fail("反馈已结束，无法进行对话", 400),
        );
        return;
      }

      // ✅ 生成一个可预览的 fileUrl（mock 不落盘，只要 URL 看起来像即可）
      let fileUrl: string | null = null;

      // 兼容：前端可能会直接传 fileUrl（极少），或者 parseJson 把 file 信息转成对象
      if (typeof body?.fileUrl === "string" && body.fileUrl) {
        fileUrl = body.fileUrl;
      } else if (body?.file && typeof body.file === "object") {
        const filename =
          typeof body.file?.name === "string" ? body.file.name : "附件.pdf";
        fileUrl = `http://localhost:8088/mock-upload/${encodeURIComponent(filename)}`;
      }

      const msg: FeedbackMessage = {
        sessionId,
        content,
        fileUrl,
        time: nowStr(),
        username: me.username,
        name: me.name,
        type: me.username === s.username ? 0 : 1,
      };

      if (!messageStore[sessionId]) messageStore[sessionId] = [];
      messageStore[sessionId].push(msg); // ✅ 关键：真实写入内存，页面 reload 就能看到

      // 可选：首次有对话后，把 state 从 0 -> 1
      if (s.state === 0) s.state = 1;

      sendJson(res as ServerResponse, 200, ok("成功发送1条消息", "操作成功"));
    } catch (e) {
      safe500(res as ServerResponse, e);
    }
  });
}
