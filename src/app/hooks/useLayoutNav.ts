import { useCallback, useEffect, useMemo, useState } from "react";
import { Grid } from "antd";

const { useBreakpoint } = Grid;

export type UseLayoutNavOptions = {
  /** 小于 md 视为移动端；你也可以改成 "lg" */
  mobileBreakpoint?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

  /** 桌面端默认是否折叠 */
  defaultCollapsed?: boolean;

  /**
   * 可选：折叠状态持久化 key
   * - 同一套系统建议固定一个 key
   */
  storageKey?: string;
};

export type LayoutNavState = {
  /** 是否移动端 */
  isMobile: boolean;

  /** 桌面端折叠 */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;

  /** 移动端抽屉 */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  /** Header 左上角按钮：移动端开抽屉；桌面端切换折叠 */
  toggleNav: () => void;

  /** 在“路由跳转后/点击菜单后”调用：移动端自动收起抽屉 */
  afterNavigate: () => void;
};

function readBoolFromStorage(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeBoolToStorage(key: string, val: boolean) {
  try {
    localStorage.setItem(key, val ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * useLayoutNav
 * - 负责导航区域的“交互状态”
 * - 不关心菜单数据、路由映射、权限等业务逻辑
 * - 只关心：是否移动端、折叠、抽屉开关、点击后收起
 */
export function useLayoutNav(
  options: UseLayoutNavOptions = {},
): LayoutNavState {
  const {
    mobileBreakpoint = "md",
    defaultCollapsed = false,
    storageKey = "app.nav.collapsed",
  } = options;

  const screens = useBreakpoint();

  // ✅ 小于 mobileBreakpoint 视为移动端
  const isMobile = !screens[mobileBreakpoint];

  // ✅ 初始化：优先读持久化，其次用 defaultCollapsed
  const [collapsed, setCollapsedState] = useState(() => {
    const persisted = readBoolFromStorage(storageKey);
    return persisted ?? defaultCollapsed;
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ✅ 在“移动端”时不使用 collapsed，但不要把用户桌面偏好抹掉
  // - 只做 UI 行为：切到移动端就关抽屉、并让侧边栏呈现为“展开”
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  // ✅ 持久化：只要 collapsed 变化就写入（桌面偏好）
  useEffect(() => {
    writeBoolToStorage(storageKey, collapsed);
  }, [collapsed, storageKey]);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const toggleNav = useCallback(() => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setCollapsedState((v) => !v);
    }
  }, [isMobile]);

  const afterNavigate = useCallback(() => {
    if (isMobile) setDrawerOpen(false);
  }, [isMobile]);

  // ✅ 对外暴露的 collapsed：移动端永远当作 false（因为 Drawer 不需要折叠态）
  const collapsedForView = useMemo(() => {
    return isMobile ? false : collapsed;
  }, [isMobile, collapsed]);

  return {
    isMobile,
    collapsed: collapsedForView,
    setCollapsed,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleNav,
    afterNavigate,
  };
}

export default useLayoutNav;
