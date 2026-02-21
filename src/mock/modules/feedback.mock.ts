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

      // ✅ 兼容：sessionId（正确） + sessionId（你刚踩坑那个）
      const sessionId = toStr(body?.sessionId || body?.sessionId);
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
