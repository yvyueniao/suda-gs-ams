import { message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import { login } from "../api";
import { encryptPassword } from "../crypto";
import { setToken } from "../../../shared/session/token";
import { setUser } from "../../../shared/session/session";
import { ApiError } from "../../../shared/http/error";

/**
 * useLogin
 *
 * 职责：
 * - 封装完整的「登录流程编排」
 * - UI 层只负责调用 doLogin
 *
 * 包含：
 * - 密码加密
 * - 登录接口调用
 * - token / user 落库
 * - 错误提示
 * - 登录后回跳（支持 RequireAuth 重定向）
 */
export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 如果是被 RequireAuth 重定向过来的
   * location.state.from 会记录原始目标路径
   * 否则默认进入 /enroll
   */
  const state = location.state as { from?: string } | null;
  const from = state?.from || "/enroll";

  /**
   * 执行登录
   */
  async function doLogin(username: string, password: string): Promise<void> {
    try {
      const resp = await login({
        username,
        password: encryptPassword(password),
      });

      // 建立登录态
      setToken(resp.token);
      setUser(resp.user);

      message.success("登录成功");

      // 回跳到用户原本要访问的页面
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        message.error(err.message);
      } else {
        message.error("登录失败，请重试");
      }
      throw err; // 让调用方可感知失败（如控制 loading）
    }
  }

  return { doLogin };
}
