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
 * 额外增强：
 * - 可选：校验通过后拉一次 /user/info，初始化用户信息（并可能刷新 token）
 */
export default function RequireAuth() {
  const location = useLocation();
  const token = getToken();

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      // 1) 本地无 token：直接判未登录
      if (!token) {
        if (!alive) return;
        setAuthed(false);
        setChecking(false);
        return;
      }

      try {
        // 2) 先用 /token 校验 token 是否有效（轻量）
        await verifyToken();

        // 3) 可选增强：拉取 /user/info（初始化用户信息 + 可能刷新 token）
        //    如果你不想每次进入都拉，可把这段放到 AppLayout 初始化里
        const info = await getUserInfo();
        setUser(info.user);
        if (info.token) setToken(info.token);

        if (!alive) return;
        setAuthed(true);
      } catch (e) {
        // axios 响应拦截器里你已经在 401 时 clearToken() 了
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
  }, [token]);

  // 校验中：给个全屏 loading，避免页面闪一下又被踢回登录
  if (checking) {
    return <Spin fullscreen />;
  }

  // 未通过：跳登录 + 记录原路径（登录成功后回跳）
  if (!authed) {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // 通过：渲染子路由
  return <Outlet />;
}
