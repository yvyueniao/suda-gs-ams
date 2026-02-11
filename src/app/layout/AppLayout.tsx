// src/app/layout/AppLayout.tsx
import { useMemo } from "react";
import { Layout, Typography, Dropdown, Spin, message, Button } from "antd";
import type { MenuProps } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import type { MenuNode } from "../../features/auth/types";
import { MENU_KEY_TO_PATH, pathToMenuKey } from "../menu/menuMap";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { useLogout } from "../../features/auth/hooks/useLogout";

import AppNav from "./AppNav";
import { useLayoutNav } from "../hooks/useLayoutNav";

// ✅ 新增：菜单 key -> icon 的映射
import { getMenuIcon } from "../menu/menuIconMap";

// ✅ 异步动作编排（统一 toast + loading）
import { useAsyncAction } from "../../shared/actions";

// ✅ 二次确认弹窗（你们封装好的）
import { confirmAsync } from "../../shared/ui/confirmAsync";

const { Header, Content, Footer } = Layout;

function roleLabel(role: number) {
  const map: Record<number, string> = {
    0: "管理员",
    1: "主席",
    2: "部长",
    3: "干事",
    4: "普通学生",
  };
  return map[role] ?? `角色${role}`;
}

function buildAntdMenuItems(nodes: MenuNode[]): MenuProps["items"] {
  return nodes.map((n) => ({
    key: n.key,
    icon: getMenuIcon(n.key),
    label: n.label,
    children: n.children?.length ? buildAntdMenuItems(n.children) : undefined,
  }));
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 初始化逻辑解耦：user/menu/loading/error 全部从 hook 来
  const { user, menuTree, loading } = useAppBootstrap();

  // ✅ 退出逻辑（Pure）：只清 session + 跳转，不弹窗、不 toast
  const { logout } = useLogout();

  // ✅ 退出异步编排：统一 toast + loading
  const logoutAction = useAsyncAction({
    successMessage: "已退出登录",
    errorMessage: "退出失败",
  });

  // ✅ 导航交互状态解耦：是否移动端、折叠、抽屉开关
  const {
    isMobile,
    collapsed,
    drawerOpen,
    closeDrawer,
    toggleNav,
    afterNavigate,
  } = useLayoutNav({ mobileBreakpoint: "md", defaultCollapsed: false });

  const menuItems = useMemo(() => buildAntdMenuItems(menuTree), [menuTree]);

  // 菜单高亮：pathname -> 后端 menu key
  const selectedKeys = useMemo(() => {
    const key = pathToMenuKey(location.pathname);
    return key ? [key] : [];
  }, [location.pathname]);

  // 点击菜单：后端 key -> 前端路由 path
  const onMenuClick: MenuProps["onClick"] = (e) => {
    const key = String(e.key);
    const path = MENU_KEY_TO_PATH[key];

    if (!path) {
      message.warning("该菜单未配置路由映射");
      return;
    }

    navigate(path);

    // ✅ 移动端点完菜单自动收起抽屉
    afterNavigate();
  };

  // 右上角下拉：个人中心 / 退出
  const dropdownItems: MenuProps["items"] = useMemo(() => {
    return [
      { key: "profile", label: "个人中心" },
      { type: "divider" as const },
      {
        key: "logout",
        label: logoutAction.loading ? "退出中..." : "退出",
        disabled: logoutAction.loading,
      },
    ];
  }, [logoutAction.loading]);

  // ✅ 下拉点击：加二次确认 + 统一异步编排
  const onDropdownClick: MenuProps["onClick"] = async ({ key }) => {
    if (key === "profile") {
      navigate("/profile");
      return;
    }

    if (key === "logout") {
      const ok = await confirmAsync({
        title: "确认退出登录？",
        content: "退出后需要重新登录才能使用系统功能。",
        okText: "退出",
        cancelText: "取消",
        danger: true,
      });

      if (!ok) return;

      await logoutAction.run(() => logout());
    }
  };

  if (loading) return <Spin fullscreen />;

  const navBtnIcon = isMobile ? (
    <MenuOutlined />
  ) : collapsed ? (
    <MenuUnfoldOutlined />
  ) : (
    <MenuFoldOutlined />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            type="text"
            aria-label="menu"
            onClick={toggleNav}
            icon={navBtnIcon}
            style={{ color: "#fff" }}
          />
          <Typography.Title
            level={4}
            style={{
              color: "#fff",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: isMobile ? 180 : 520,
            }}
          >
            苏大计算机学院研究生会活动管理系统
          </Typography.Title>
        </div>

        <Dropdown
          menu={{ items: dropdownItems, onClick: onDropdownClick }}
          trigger={["click"]}
        >
          <Typography.Text
            style={{
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {user?.name ?? "未登录"}（{user ? roleLabel(user.role) : "-"}）
          </Typography.Text>
        </Dropdown>
      </Header>

      <Layout>
        <AppNav
          isMobile={isMobile}
          collapsed={collapsed}
          menuItems={menuItems}
          selectedKeys={selectedKeys}
          onMenuClick={onMenuClick}
          drawerOpen={drawerOpen}
          onCloseDrawer={closeDrawer}
          siderWidth={220}
          drawerWidth={260}
        />

        <Content style={{ padding: isMobile ? 12 : 16 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* ✅ 通用页脚 */}
      <Footer
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "rgba(0,0,0,0.45)",
          padding: "12px 16px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "#fff",
        }}
      >
        © {new Date().getFullYear()} 苏州大学计算机科学与技术学院 ·
        研究生会活动管理系统
      </Footer>
    </Layout>
  );
}
