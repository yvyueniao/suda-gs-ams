// src/app/hooks/useAppBootstrap.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMenuList, getUserInfo } from "../../features/auth/api";
import type { MenuNode, User } from "../../features/auth/types";
import { ApiError } from "../../shared/http/error";
import { getUser, setUser } from "../../shared/session/session";

export function useAppBootstrap() {
  const navigate = useNavigate();

  // ✅ 优先使用本地缓存 user，避免闪一下“未登录”
  const [user, setUserState] = useState<User | null>(() => getUser());
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // ✅ 防止 React18 StrictMode 开发环境 effect 执行两次
  const ranOnceRef = useRef(false);
  // ✅ 防止卸载后 setState
  const aliveRef = useRef(true);

  const refetch = useCallback(async () => {
    // ✅ 如果正在加载中，点击重试不再重复发请求
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const info = await getUserInfo();
      if (!aliveRef.current) return;

      setUser(info.user);
      setUserState(info.user);

      const menus = await getMenuList();
      if (!aliveRef.current) return;

      setMenuTree(menus);
    } catch (err) {
      if (!aliveRef.current) return;

      const apiErr =
        err instanceof ApiError ? err : new ApiError("初始化失败", "UNKNOWN");
      setError(apiErr);

      // ✅ 你要求：失败后直接跳 404
      navigate("/404", { replace: true });
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }, [loading, navigate]);

  useEffect(() => {
    aliveRef.current = true;

    // ✅ 首次只自动执行一次
    if (!ranOnceRef.current) {
      ranOnceRef.current = true;
      // 首次进入：允许自动请求（不需要用户点重试）
      void (async () => {
        // 这里不要走 if(loading) 的短路，所以手动执行一遍内部逻辑
        try {
          setLoading(true);
          setError(null);

          const info = await getUserInfo();
          if (!aliveRef.current) return;

          setUser(info.user);
          setUserState(info.user);

          const menus = await getMenuList();
          if (!aliveRef.current) return;

          setMenuTree(menus);
        } catch (err) {
          if (!aliveRef.current) return;

          const apiErr =
            err instanceof ApiError
              ? err
              : new ApiError("初始化失败", "UNKNOWN");
          setError(apiErr);

          navigate("/404", { replace: true });
        } finally {
          if (!aliveRef.current) return;
          setLoading(false);
        }
      })();
    }

    return () => {
      aliveRef.current = false;
    };
  }, [navigate]);

  const authed = useMemo(() => Boolean(user), [user]);

  return {
    user,
    menuTree,
    loading,
    error,
    authed,
    refetch, // ✅ 点击重试用这个
  };
}
