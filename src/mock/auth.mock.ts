import type { Connect } from "vite";

/**
 * 模拟数据库中的用户
 * username: 11 位学号
 * password: 已“加密”的固定值（mock 不做真加密）
 */
const MOCK_USER = {
  id: 1,
  username: "20254227087",
  name: "梁靖松",
  invalid: true,
  role: 2, // 2: 部长
  menuPermission: null,
  email: "123@qq.com",
  major: "软件工程",
  grade: "1",
  createTime: "2026-02-01 12:00:30",
  lastLoginTime: "2026-02-01 18:10:05",
};

/**
 * mock token（随便一段字符串）
 */
const MOCK_TOKEN = "mock-jwt-token-2026-02-01";

/**
 * 工具：解析 JSON body
 */
function parseBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * 工具：返回统一壳
 */
function ok(data: any, msg = "成功") {
  return {
    code: 200,
    msg,
    data,
    timestamp: Date.now(),
  };
}

function fail(msg: string, code = 400) {
  return {
    code,
    msg,
    data: null,
    timestamp: Date.now(),
  };
}

/**
 * 注册 auth 相关 mock 接口
 */
export function setupAuthMock(middlewares: Connect.Server) {
  /**
   * 登录
   * POST /api/login
   */
  middlewares.use("/api/suda_login", async (req, res, next) => {
    if (req.method !== "POST") return next();

    const body = await parseBody(req);
    const { username, password } = body;

    // mock 校验逻辑
    if (username !== MOCK_USER.username) {
      res.end(JSON.stringify(fail("账号不存在")));
      return;
    }

    if (!password) {
      res.end(JSON.stringify(fail("密码错误")));
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        ok(
          {
            user: MOCK_USER,
            token: MOCK_TOKEN,
          },
          "认证成功",
        ),
      ),
    );
  });

  /**
   * 验证 token 是否有效
   * POST /api/token
   */
  middlewares.use("/api/token", async (req, res, next) => {
    if (req.method !== "POST") return next();

    const auth = req.headers.authorization;

    if (auth !== MOCK_TOKEN) {
      res.statusCode = 401;
      res.end(JSON.stringify(fail("token 无效或已过期", 401)));
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(ok(MOCK_USER, "token有效")));
  });

  /**
   * 获取当前用户信息
   * POST /api/user/info
   */
  middlewares.use("/api/user/info", async (req, res, next) => {
    if (req.method !== "POST") return next();

    const auth = req.headers.authorization;

    if (auth !== MOCK_TOKEN) {
      res.statusCode = 401;
      res.end(JSON.stringify(fail("token 无效或已过期", 401)));
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        ok(
          {
            user: MOCK_USER,
            token: MOCK_TOKEN, // mock 成“刷新 token”
          },
          "获取成功",
        ),
      ),
    );
  });

  /**
   * 获取菜单
   * POST /api/menuList
   */
  middlewares.use("/api/menuList", async (req, res, next) => {
    if (req.method !== "POST") return next();

    const auth = req.headers.authorization;

    if (auth !== MOCK_TOKEN) {
      res.statusCode = 401;
      res.end(JSON.stringify(fail("token 无效或已过期", 401)));
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        ok(
          [
            {
              key: "apply",
              label: "活动/讲座报名",
              children: [
                { key: "apply_list", label: "活动/讲座列表", children: [] },
              ],
            },
            {
              key: "feedback",
              label: "反馈中心",
              children: [
                { key: "my_feedback", label: "我的反馈", children: [] },
              ],
            },
            {
              key: "profile",
              label: "个人中心",
              children: [
                { key: "profile_info", label: "我的信息", children: [] },
              ],
            },
          ],
          "获取成功",
        ),
      ),
    );
  });
}
