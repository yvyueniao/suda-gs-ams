// src/app/hooks/useLayoutNav.ts
import { useCallback, useEffect, useState } from "react";
import { Grid } from "antd";

const { useBreakpoint } = Grid;

export type UseLayoutNavOptions = {
  /** 小于 md 视为移动端；你也可以改成 "lg" */
  mobileBreakpoint?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

  /** 桌面端默认是否折叠 */
  defaultCollapsed?: boolean;
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

/**
 * useLayoutNav
 * - 负责导航区域的“交互状态”
 * - 不关心菜单数据、路由映射、权限等业务逻辑
 * - 只关心：是否移动端、折叠、抽屉开关、点击后收起
 */
export function useLayoutNav(
  options: UseLayoutNavOptions = {},
): LayoutNavState {
  const { mobileBreakpoint = "md", defaultCollapsed = false } = options;

  const screens = useBreakpoint();

  // ✅ 规则：小于 mobileBreakpoint 就视为移动端
  // - AntD screens[md] 表示 >= md
  // - 所以 isMobile = !screens[md]
  const isMobile = !screens[mobileBreakpoint];

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ✅ 当切换到移动端时，关闭折叠（折叠对移动端没意义），并关闭 Drawer
  useEffect(() => {
    if (isMobile) {
      setCollapsed(false);
      // 不强制关闭也行，但一般切换断点时关一下更干净
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const toggleNav = useCallback(() => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setCollapsed((v) => !v);
    }
  }, [isMobile]);

  // ✅ 跳转/点菜单后：移动端自动收起 Drawer
  const afterNavigate = useCallback(() => {
    if (isMobile) setDrawerOpen(false);
  }, [isMobile]);

  return {
    isMobile,
    collapsed,
    setCollapsed,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleNav,
    afterNavigate,
  };
}

export default useLayoutNav;
