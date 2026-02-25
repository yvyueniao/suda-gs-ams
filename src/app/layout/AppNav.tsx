// src/app/layout/AppNav.tsx
import { Drawer, Layout, Menu } from "antd";
import type { MenuProps } from "antd";

const { Sider } = Layout;

export type AppNavProps = {
  /** 是否移动端：true -> Drawer；false -> Sider */
  isMobile: boolean;

  /** 桌面端折叠状态（移动端可忽略） */
  collapsed: boolean;

  /** 菜单数据（AntD Menu items） */
  menuItems: MenuProps["items"];

  /** 当前高亮的菜单 key（通常是 [key] 或 []） */
  selectedKeys: string[];

  /** 点击菜单 */
  onMenuClick: MenuProps["onClick"];

  /** 移动端 Drawer 是否打开 */
  drawerOpen: boolean;

  /** 关闭移动端 Drawer */
  onCloseDrawer: () => void;

  /** 侧边栏宽度（可选） */
  siderWidth?: number;

  /** Drawer 宽度（可选） */
  drawerWidth?: number;
};

/**
 * AppNav
 * - 只负责“导航区域 UI”
 * - 桌面端：Sider + Menu（支持折叠）
 * - 移动端：Drawer + Menu（打开/关闭由外部控制）
 *
 * ✅ 业务逻辑（navigate/logout/menu 映射）不放这里
 * ✅ 响应式判断/折叠状态也不放这里（由 useLayoutNav 负责）
 */
export default function AppNav({
  isMobile,
  collapsed,
  menuItems,
  selectedKeys,
  onMenuClick,
  drawerOpen,
  onCloseDrawer,
  siderWidth = 220,
  drawerWidth = 260,
}: AppNavProps) {
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selectedKeys}
      items={menuItems}
      onClick={onMenuClick}
      className="app-menu"
    />
  );

  // ✅ 移动端：Drawer（独立滚动，不影响页面布局）
  if (isMobile) {
    return (
      <Drawer
        title="菜单"
        placement="left"
        open={drawerOpen}
        onClose={onCloseDrawer}
        width={drawerWidth}
        bodyStyle={{ padding: 0, overflow: "auto" }}
        className="app-drawer"
      >
        {menu}
      </Drawer>
    );
  }

  // ✅ 桌面端：Sider 固定在可视区高度内（跟随 Header），自身可滚动
  // 说明：
  // - 你的 AppLayout 已把中间区域做成固定高度的 flex 容器（app-body）
  // - 这里让 Sider: height:100% + overflow:auto，确保页面滚动时左侧不“消失”
  return (
    <Sider
      width={siderWidth}
      theme="light"
      collapsible
      collapsed={collapsed}
      trigger={null} // 由 Header 按钮控制折叠
      className="app-sider"
      style={{
        height: "100%",
        overflow: "auto",
        borderRight: "1px solid rgba(17, 24, 39, 0.06)",
      }}
    >
      {menu}
    </Sider>
  );
}
