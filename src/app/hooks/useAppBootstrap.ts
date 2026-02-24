//src\app\hooks\useAppBootstrap.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getMenuList, getUserInfo } from "../../features/auth/api";
import type { MenuNode, User } from "../../features/auth/types";
import { ApiError } from "../../shared/http/error";
import { getUser, setUser } from "../../shared/session/session";

export function useAppBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 优先使用本地缓存 user，避免闪一下“未登录”
  const [user, setUserState] = useState<User | null>(() => getUser());
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // ✅ 防止 React18 StrictMode 开发环境 effect 执行两次
  const ranOnceRef = useRef(false);
  // ✅ 防止卸载后 setState
  const aliveRef = useRef(true);

  /**
   * bootstrap：统一初始化链路
   * 1) /user/info（后端可能刷新 token；shared/http 拦截器负责 token 注入 & token 刷新落库）
   * 2) /menuList
   */
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const info = await getUserInfo();
      if (!aliveRef.current) return;

      // ✅ 落库 user（token 刷新交给 shared/http 拦截器做；这里不动 shared）
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

      // ✅ 你要求：问题2改成 500
      navigate("/500", {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }, [navigate, location.pathname, location.search]);

  /**
   * refetch：给“重试/刷新”用
   * ✅ 如果正在加载中，点击重试不重复发请求
   */
  const refetch = useCallback(async () => {
    if (loading) return;
    await bootstrap();
  }, [loading, bootstrap]);

  useEffect(() => {
    aliveRef.current = true;

    if (!ranOnceRef.current) {
      ranOnceRef.current = true;
      void bootstrap();
    }

    return () => {
      aliveRef.current = false;
    };
  }, [bootstrap]);

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
