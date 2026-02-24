import { login } from "../api";
import { encryptPassword } from "../crypto";
import { setToken } from "../../../shared/session/token";
import { setUser } from "../../../shared/session/session";
import { track } from "../../../shared/telemetry/track";
import { ApiError } from "../../../shared/http/error";

/**
 * useLogin
 *
 * 职责（方案 B）：
 * - 封装「登录业务流程」
 * - 不关心 UI（不 message）
 * - 不关心路由（不 navigate / 不读 location）
 *
 * 包含：
 * - 密码加密
 * - 登录接口调用
 * - token / user 落库
 *
 * 不包含：
 * - 成功 / 失败提示
 * - 登录后跳转逻辑
 */
export function useLogin() {
  async function doLogin(username: string, password: string) {
    const startedAt = Date.now();
    const safeUsername = String(username).trim();

    try {
      const resp = await login({
        username: safeUsername,
        password: encryptPassword(password),
      });

      setToken(resp.token);
      setUser(resp.user);

      // ✅ 业务级埋点：登录成功（不记录密码/token）
      track({
        event: "login_success",
        data: {
          username_len: safeUsername.length,
          role: resp.user?.role,
          cost_ms: Date.now() - startedAt,
        },
        asEvent: true,
      });

      return resp.user;
    } catch (e: any) {
      const cost = Date.now() - startedAt;

      // ✅ 业务级埋点：登录失败
      // - 这里不 captureException（避免噪音），用 track 做 breadcrumb/可选事件即可
      // - 失败原因只记录“可匿名”的错误元信息
      const apiErr = e instanceof ApiError ? e : null;

      track({
        event: "login_fail",
        level: "warning",
        data: {
          username_len: safeUsername.length,
          code: apiErr?.code, // NETWORK_ERROR / TIMEOUT / BIZ_ERROR ...
          status: apiErr?.status,
          biz_code: apiErr?.bizCode,
          cost_ms: cost,
        },
        asEvent: true, // ✅ 登录失败通常值得作为“事件”保留
      });

      throw e;
    }
  }

  return { doLogin };
}
