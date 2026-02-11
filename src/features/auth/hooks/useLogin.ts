// src/features/auth/hooks/useLogin.ts
import { login } from "../api";
import { encryptPassword } from "../crypto";
import { setToken } from "../../../shared/session/token";
import { setUser } from "../../../shared/session/session";

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
    const resp = await login({
      username,
      password: encryptPassword(password),
    });

    setToken(resp.token);
    setUser(resp.user);

    return resp.user;
  }

  return { doLogin };
}
