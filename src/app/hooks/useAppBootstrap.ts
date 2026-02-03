import { useEffect, useMemo, useState } from "react";
import { message } from "antd";

import { getMenuList, getUserInfo } from "../../features/auth/api";
import type { MenuNode, User } from "../../features/auth/types";
import { ApiError } from "../../shared/http/error";
import { getUser, setUser } from "../../shared/session/session";

/**
 * useAppBootstrap
 *
 * 负责 AppLayout 初始化阶段的数据准备：
 * - /user/info 获取当前用户（并写入 localStorage）
 * - /menuList 获取菜单树
 * - 管理 loading 状态
 * - 处理初始化错误（对 401 不做 toast，让 RequireAuth 兜底跳转更干净）
 *
 * Layout 只负责“渲染 + 交互”，不负责“业务编排”。
 */
export function useAppBootstrap() {
  // ✅ 优先使用本地缓存 user，避免闪一下“未登录”
  const [user, setUserState] = useState<User | null>(() => getUser());
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);

  // 你也可以暴露一个 error 状态给 UI（比如显示 ErrorResult）
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        // 1) 拉用户信息（后端可能刷新 token）
        const info = await getUserInfo();
        if (!alive) return;

        setUser(info.user);
        setUserState(info.user);

        // 2) 拉菜单
        const menus = await getMenuList();
        if (!alive) return;

        setMenuTree(menus);
      } catch (err) {
        if (!alive) return;

        if (err instanceof ApiError) {
          setError(err);

          /**
           * 401/403 通常是登录态问题：
           * - token 失效会被 RequireAuth 兜底跳转到 /login
           * - 这里不再额外弹 toast，避免“闪一下错误再跳走”
           */
          if (err.status !== 401 && err.status !== 403) {
            message.error(err.message);
          }
        } else {
          // 非 ApiError 的兜底
          message.error("初始化失败，请稍后重试");
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, []);

  // 可选：给 Layout 一个“是否已登录用户”的派生值
  const authed = useMemo(() => Boolean(user), [user]);

  return {
    user,
    menuTree,
    loading,
    error,
    authed,
    // 如果以后你想支持“点击重试”，可以把 init 抽出来 return 一个 refetch()
  };
}
