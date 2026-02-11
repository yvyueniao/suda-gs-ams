// src/app/routes/RequireAuth.tsx
import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Spin } from "antd";

import { getToken, clearToken, setToken } from "../../shared/session/token";
import { verifyToken, getUserInfo } from "../../features/auth/api";
import { ApiError } from "../../shared/http/error";
import { clearUser, setUser } from "../../shared/session/session";

type GuardState = "checking" | "ok" | "login" | "fatal";

export default function RequireAuth() {
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<GuardState>(() => {
    const token = getToken();
    return token ? "checking" : "login";
  });

  // ✅ React18 StrictMode 开发环境会执行两次，用 ref 拦住
  const ranRef = useRef(false);
  // ✅ 防止失败后反复 navigate
  const fatalRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = getToken();
    if (!token) {
      setState("login");
      return;
    }

    (async () => {
      try {
        // 1) 校验 token
        await verifyToken();

        // 2) 拉用户信息（可能刷新 token）
        const info = await getUserInfo();
        setUser(info.user);
        if (info.token) setToken(info.token);

        setState("ok");
      } catch (e: any) {
        // 401/403：登录态问题 -> 去登录
        if (e instanceof ApiError) {
          if (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN") {
            clearToken();
            clearUser();
            setState("login");
            return;
          }
        }

        // ✅ 其他错误：服务器挂了/断网/404/500...
        // 直接跳 404，并进入 fatal（终止态，不再请求 token）
        if (!fatalRef.current) {
          fatalRef.current = true;
          setState("fatal");
          navigate("/500", { replace: true });
        }
      }
    })();
  }, [navigate]);

  if (state === "checking") return <Spin fullscreen />;

  if (state === "login") {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // fatal：已 navigate(/404)，这里返回 null 即可
  if (state === "fatal") return null;

  return <Outlet />;
}
