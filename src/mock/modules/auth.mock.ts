// src/mock/modules/auth.mock.ts
import type { Connect } from "vite";
import { parseJson, ok, fail, sendJson } from "../core/http";
import { maybeFail, maybeEmpty, withDelay } from "../core/faults";
import { MOCK_TOKEN, requireAuth } from "../core/auth";

const MOCK_USER = {
  id: 1,
  username: "20254227087",
  name: "梁靖松1",
  invalid: true,
  role: 2,
  menuPermission: null,
  email: "123@qq.com",
  major: "软件工程",
  grade: "1",
  createTime: "2026-02-01 12:00:30",
  lastLoginTime: "2026-02-01 18:10:05",

  // ✅ /user/info 扩展字段（接口文档里有）
  serviceScore: 1,
  lectureNum: 0,
  department: null,
};

const MENU_TREE = [
  {
    key: "apply",
    label: "活动/讲座报名",
    children: [{ key: "apply_list", label: "活动/讲座列表", children: [] }],
  },
  {
    key: "feedback",
    label: "反馈中心",
    children: [{ key: "my_feedback", label: "我的反馈", children: [] }],
  },
  {
    key: "profile",
    label: "个人中心",
    children: [{ key: "profile_info", label: "我的信息", children: [] }],
  },
  {
    key: "activity_manage",
    label: "活动/讲座管理",
    children: [
      {
        key: "activity_manage_list",
        label: "活动/讲座列表",
        children: [],
      },
    ],
  },
  {
    key: "feedback_handle",
    label: "反馈处理",
    children: [
      { key: "feedback_handle_list", label: "反馈列表", children: [] },
    ],
  },
  {
    key: "user_permission",
    label: "用户与权限",
    children: [
      { key: "user_manage", label: "用户管理", children: [] },
      { key: "admin_manage", label: "管理员管理", children: [] },
    ],
  },
  {
    key: "org",
    label: "组织架构",
    children: [{ key: "dept_manage", label: "部门管理", children: [] }],
  },
  {
    key: "system",
    label: "系统管理",
    children: [{ key: "operation_log", label: "操作日志", children: [] }],
  },
];

// ===== 忘记密码 mock（无需登录）=====
type VerifyCodeStore = Record<
  string,
  {
    code: string;
    expiresAt: number; // ms
  }
>;

const VERIFY_CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const verifyCodeStore: VerifyCodeStore = Object.create(null);

function genVerifyCode() {
  // 6 位数字
  return String(Math.floor(100000 + Math.random() * 900000));
}

type MW = Connect.Server;

export function setupAuthMock(middlewares: MW) {
  /**
   * 登录
   * POST /api/suda_login
   */
  middlewares.use("/api/suda_login", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    const body = await parseJson(req);
    const { username, password } = body ?? {};

    if (username !== MOCK_USER.username) {
      return sendJson(res, 200, fail("账号不存在"));
    }
    if (!password) {
      return sendJson(res, 200, fail("密码错误"));
    }

    return sendJson(
      res,
      200,
      ok({ user: MOCK_USER, token: MOCK_TOKEN }, "认证成功"),
    );
  });

  /**
   * 验证 token
   * POST /api/token
   */
  middlewares.use("/api/token", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    return sendJson(res, 200, ok(MOCK_USER, "token有效"));
  });

  /**


  /**
   * 菜单
   * POST /api/menuList
   */
  middlewares.use("/api/menuList", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    // ✅ 空态：返回 []
    if (maybeEmpty(res, [], "获取成功")) return;

    return sendJson(res, 200, ok(MENU_TREE, "获取成功"));
  });

  /**
   * ===== 忘记密码（无需登录）=====
   * 1) 发送验证码
   * POST /api/user/send-verify-code
   * data: null
   */
  middlewares.use("/api/user/send-verify-code", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    const body = await parseJson(req);
    const username = String(body?.username ?? "").trim();

    if (!username) return sendJson(res, 200, fail("username 不能为空"));
    if (!/^\d{11}$/.test(username)) {
      return sendJson(res, 200, fail("账号格式不正确（应为 11 位数字）"));
    }

    // mock：仅允许已存在账号
    if (username !== MOCK_USER.username) {
      return sendJson(res, 200, fail("账号不存在"));
    }

    const code = genVerifyCode();
    verifyCodeStore[username] = {
      code,
      expiresAt: Date.now() + VERIFY_CODE_TTL_MS,
    };

    // ✅ 注意：真实后端不会返回验证码；mock 为了调试可在控制台打印
    console.log(`[mock] verify code for ${username}: ${code}`);

    return sendJson(res, 200, ok(null, "发送成功"));
  });

  /**
   * 2) 忘记密码 - 修改密码
   * POST /api/user/forget-password
   * data: string
   */
  middlewares.use("/api/user/forget-password", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    const body = await parseJson(req);
    const username = String(body?.username ?? "").trim();
    const verifyCode = String(body?.verifyCode ?? "").trim();
    const newPassword = String(body?.newPassword ?? "").trim();

    if (!username) return sendJson(res, 200, fail("username 不能为空"));
    if (!verifyCode) return sendJson(res, 200, fail("verifyCode 不能为空"));
    if (!newPassword) return sendJson(res, 200, fail("newPassword 不能为空"));

    if (!/^\d{11}$/.test(username)) {
      return sendJson(res, 200, fail("账号格式不正确（应为 11 位数字）"));
    }
    if (!/^\d{6}$/.test(verifyCode)) {
      return sendJson(res, 200, fail("验证码格式不正确（应为 6 位数字）"));
    }

    // mock：仅允许已存在账号
    if (username !== MOCK_USER.username) {
      return sendJson(res, 200, fail("账号不存在"));
    }

    const rec = verifyCodeStore[username];
    if (!rec) return sendJson(res, 200, fail("请先获取验证码"));
    if (Date.now() > rec.expiresAt) {
      delete verifyCodeStore[username];
      return sendJson(res, 200, fail("验证码已过期，请重新获取"));
    }
    if (rec.code !== verifyCode) {
      return sendJson(res, 200, fail("验证码错误"));
    }

    // 消费验证码（一次性）
    delete verifyCodeStore[username];

    return sendJson(res, 200, ok("成功修改1条数据", "操作成功"));
  });
}
