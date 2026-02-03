import type { Connect } from "vite";
import { parseJson, ok, fail, sendJson } from "../core/http";
import { maybeFail, maybeEmpty, withDelay } from "../core/faults";
import { MOCK_TOKEN, requireAuth } from "../core/auth";

const MOCK_USER = {
  id: 1,
  username: "20254227087",
  name: "梁靖松",
  invalid: true,
  role: 2,
  menuPermission: null,
  email: "123@qq.com",
  major: "软件工程",
  grade: "1",
  createTime: "2026-02-01 12:00:30",
  lastLoginTime: "2026-02-01 18:10:05",
};

const MENU_TREE = [
  {
    key: "apply",
    label: "活动/讲座报名",
    children: [
      {
        key: "apply_list",
        label: "活动/讲座列表",
      },
    ],
  },

  {
    key: "feedback",
    label: "反馈中心",
    children: [
      {
        key: "my_feedback",
        label: "我的反馈",
      },
    ],
  },

  {
    key: "profile",
    label: "个人中心",
    children: [
      {
        key: "profile_info",
        label: "我的信息",
      },
    ],
  },

  {
    key: "activity_manage",
    label: "活动/讲座管理",
    children: [
      {
        key: "activity_manage_list",
        label: "活动/讲座列表",
      },
    ],
  },

  {
    key: "feedback_handle",
    label: "反馈处理",
    children: [
      {
        key: "feedback_handle_list",
        label: "反馈列表",
      },
    ],
  },

  {
    key: "user_permission",
    label: "用户与权限",
    children: [
      {
        key: "user_manage",
        label: "用户管理",
      },
      {
        key: "admin_manage",
        label: "管理员管理",
      },
    ],
  },

  {
    key: "org",
    label: "组织架构",
    children: [
      {
        key: "dept_manage",
        label: "部门管理",
      },
    ],
  },

  {
    key: "system",
    label: "系统管理",
    children: [
      {
        key: "operation_log",
        label: "操作日志",
      },
    ],
  },
];

type MW = Connect.Server;

export function setupAuthMock(middlewares: MW) {
  // POST /api/login
  middlewares.use("/api/suda_login", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    const body = await parseJson(req);
    const { username, password } = body;

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

  // POST /api/token
  middlewares.use("/api/token", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    return sendJson(res, 200, ok(MOCK_USER, "token有效"));
  });

  // POST /api/user/info
  middlewares.use("/api/user/info", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    // 可测试空态：比如 user 为 null（但你前端可能不接受 null，就别开 emptyRate 或改成返回旧 user）
    // if (maybeEmpty(res, { user: null, token: MOCK_TOKEN }, "获取成功")) return;

    return sendJson(
      res,
      200,
      ok({ user: MOCK_USER, token: MOCK_TOKEN }, "获取成功"),
    );
  });

  // POST /api/menuList
  middlewares.use("/api/menuList", async (req, res, next) => {
    if (req.method !== "POST") return next();

    await withDelay();
    if (maybeFail(res)) return;

    if (!requireAuth(req, res)) return;

    // ✅ 空态：返回 []
    if (maybeEmpty(res, [], "获取成功")) return;

    return sendJson(res, 200, ok(MENU_TREE, "获取成功"));
  });
}
