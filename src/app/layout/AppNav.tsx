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
      style={{ height: "100%" }}
    />
  );

  // ✅ 移动端：Drawer
  if (isMobile) {
    return (
      <Drawer
        title="菜单"
        placement="left"
        open={drawerOpen}
        onClose={onCloseDrawer}
        bodyStyle={{ padding: 0 }}
        width={drawerWidth}
      >
        {menu}
      </Drawer>
    );
  }

  // ✅ 桌面端：Sider
  return (
    <Sider
      width={siderWidth}
      theme="light"
      collapsible
      collapsed={collapsed}
      trigger={null} // 由 Header 按钮控制折叠
      style={{ borderRight: "1px solid #f0f0f0" }}
    >
      {menu}
    </Sider>
  );
}
