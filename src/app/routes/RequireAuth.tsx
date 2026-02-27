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

  // ✅ React18 StrictMode 防双执行
  const ranRef = useRef(false);
  // ✅ 防止 fatal 状态反复 navigate
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
        // ✅ 1) 校验 token（新版 data:null）
        await verifyToken();

        // ✅ 2) 拉取最新用户信息（可能刷新 token）
        const info = await getUserInfo();

        setUser(info.user);
        if (info.token) {
          setToken(info.token);
        }

        setState("ok");
      } catch (e: any) {
        // ✅ token 失效 -> HTTP 401
        if (e instanceof ApiError) {
          if (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN") {
            clearToken();
            clearUser();
            setState("login");
            return;
          }
        }

        // 其他异常 -> 500
        if (!fatalRef.current) {
          fatalRef.current = true;
          setState("fatal");
          navigate("/500", {
            replace: true,
            state: { from: location.pathname + location.search },
          });
        }
      }
    })();
  }, [navigate, location.pathname, location.search]);

  if (state === "checking") {
    return <Spin fullscreen />;
  }

  if (state === "login") {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (state === "fatal") {
    return null;
  }

  return <Outlet />;
}
