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
  /**
   * 执行登录
   *
   * 成功：
   * - 返回用户信息（或 void，看你是否需要）
   *
   * 失败：
   * - 抛出 ApiError（由页面层 catch 并提示）
   */
  async function doLogin(username: string, password: string) {
    const resp = await login({
      username,
      password: encryptPassword(password),
    });

    // 建立登录态
    setToken(resp.token);
    setUser(resp.user);

    // 不提示、不跳转，只返回结果
    return resp.user;
  }

  return { doLogin };
}
