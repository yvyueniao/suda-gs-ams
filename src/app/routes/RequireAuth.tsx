import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";

import { getToken } from "../../shared/session/token";
import { verifyToken, getUserInfo } from "../../features/auth/api";
import { setUser } from "../../shared/session/session";
import { setToken } from "../../shared/session/token";

/**
 * RequireAuth
 * - 没 token：直接去 /login
 * - 有 token：调用 /token 校验有效性
 *   - 有效：放行
 *   - 无效/过期：去 /login（并携带 from 回跳地址）
 *
 * 设计原则：
 * - 是否“真登录”最终以 401 为准（http 层已 clearToken）
 * - 这里不依赖 token 变化，避免 refresh token 导致重复校验
 */
export default function RequireAuth() {
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      // ✅ 每次校验时重新读取 token（不要作为 effect 依赖）
      const token = getToken();

      // 1) 本地无 token：直接未登录
      if (!token) {
        if (!alive) return;
        setAuthed(false);
        setChecking(false);
        return;
      }

      try {
        // 2) 校验 token 是否有效
        await verifyToken();

        // 3) 拉用户信息（可能刷新 token）
        const info = await getUserInfo();
        setUser(info.user);
        if (info.token) setToken(info.token);

        if (!alive) return;
        setAuthed(true);
      } catch (e: any) {
        /**
         * ⚠️ 注意：
         * - 401 / UNAUTHORIZED：http 层已经 clearToken + clearUser
         * - 这里只负责把 authed 设为 false
         * - 网络错误 / 500 是否要踢登录，由你以后决定（现在先统一 false）
         */
        if (!alive) return;
        setAuthed(false);
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, []); // ✅ 不依赖 token，避免 refresh token 导致重复执行

  // 校验中：全屏 loading，防止页面闪一下
  if (checking) {
    return <Spin fullscreen />;
  }

  // 未通过：跳登录 + 记录回跳地址
  if (!authed) {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // 已登录：放行子路由
  return <Outlet />;
}
