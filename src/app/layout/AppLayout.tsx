// src/app/layout/AppLayout.tsx
import { useEffect, useMemo, useRef } from "react";
import {
  Layout,
  Typography,
  Dropdown,
  Spin,
  message,
  Button,
  Space,
} from "antd";
import type { MenuProps } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import type { MenuNode } from "../../features/auth/types";
import { MENU_KEY_TO_PATH, pathToMenuKey } from "../menu/menuMap";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { useLogout } from "../../features/auth/hooks/useLogout";

import AppNav from "./AppNav";
import { useLayoutNav } from "../hooks/useLayoutNav";
import { getMenuIcon } from "../menu/menuIconMap";
import { useAsyncAction } from "../../shared/actions";
import { confirmAsync } from "../../shared/ui/confirmAsync";

import { verifyToken } from "../../features/auth/api";
import { ApiError } from "../../shared/http/error";
import { clearToken } from "../../shared/session/token";
import { clearUser } from "../../shared/session/session";

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

  const { user, menuTree, loading } = useAppBootstrap();
  const { logout } = useLogout();

  const logoutAction = useAsyncAction({
    successMessage: "已退出登录",
    errorMessage: "退出失败",
  });

  const {
    isMobile,
    collapsed,
    drawerOpen,
    closeDrawer,
    toggleNav,
    afterNavigate,
  } = useLayoutNav({ mobileBreakpoint: "md", defaultCollapsed: false });

  const menuItems = useMemo(() => buildAntdMenuItems(menuTree), [menuTree]);

  const selectedKeys = useMemo(() => {
    const key = pathToMenuKey(location.pathname);
    return key ? [key] : [];
  }, [location.pathname]);

  const onMenuClick: MenuProps["onClick"] = (e) => {
    const key = String(e.key);
    const path = MENU_KEY_TO_PATH[key];

    if (!path) {
      message.warning("该菜单未配置路由映射");
      return;
    }

    navigate(path);
    afterNavigate();
  };

  // ✅ 下拉菜单：加 icon + 收紧宽度（不要跟触发按钮一样宽）
  const dropdownItems: MenuProps["items"] = useMemo(() => {
    return [
      { key: "profile", label: "个人中心", icon: <UserOutlined /> },
      { type: "divider" as const },
      {
        key: "logout",
        label: logoutAction.loading ? "退出中..." : "退出登录",
        icon: <LogoutOutlined />,
        disabled: logoutAction.loading,
      },
    ];
  }, [logoutAction.loading]);

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

  /**
   * ✅ 路由切换时校验 token（方案 B）
   * - 防抖：1s（避免连续跳转刷接口）
   * - 节流：10s（10s 内多次切换只校验一次）
   *
   * ✅ 注意：
   * - 你现在 http 层已经兼容两种“未登录”：
   *   1) HTTP 401
   *   2) HTTP 200 + code 401（统一壳）
   *   所以这里 catch 到 UNAUTHORIZED 直接清理 + 跳登录即可
   */
  const lastCheckAtRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // loading 阶段不做（避免 bootstrap 期间重复校验）
    if (loading) return;

    // 未登录不校验
    if (!user) return;

    const now = Date.now();

    // ✅ 节流：10s（只有真正发起校验成功后才更新时间，避免“失败后一直被节流挡住”）
    if (now - lastCheckAtRef.current < 10_000) return;

    // ✅ 防抖：1s
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    const from = location.pathname + location.search;

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await verifyToken();
        lastCheckAtRef.current = Date.now();
      } catch (e: any) {
        if (e instanceof ApiError) {
          if (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN") {
            clearToken();
            clearUser();
            navigate("/login", { replace: true, state: { from } });
          }
        }
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [location.pathname, location.search, navigate, loading, user]);

  if (loading) return <Spin fullscreen />;

  const navBtnIcon = isMobile ? (
    <MenuOutlined />
  ) : collapsed ? (
    <MenuUnfoldOutlined />
  ) : (
    <MenuFoldOutlined />
  );

  const userLabel = `${user?.name ?? "未登录"}（${
    user ? roleLabel(user.role) : "-"
  }）`;

  return (
    // ✅ 关键：用 className 控制“页面不滚动，只滚内容区”
    <Layout className="app-root">
      <Header className="app-header">
        <div className="app-header__left">
          <Button
            type="text"
            aria-label="menu"
            onClick={toggleNav}
            icon={navBtnIcon}
            className="app-header__navbtn"
          />
          <Typography.Title
            level={4}
            className="app-header__title"
            style={{ maxWidth: isMobile ? 180 : 520 }}
          >
            苏大计算机学院研究生会活动管理系统
          </Typography.Title>
        </div>

        <div className="app-header__right">
          <Dropdown
            trigger={["click"]}
            overlayStyle={{ minWidth: "unset" }}
            menu={{
              items: dropdownItems,
              onClick: onDropdownClick,
              style: { minWidth: 160 },
            }}
          >
            {/* ✅ 关键：直接内联强制白色，避免被全局样式覆盖 */}
            <Button
              type="text"
              className="app-header__userbtn"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              <Space size={6}>
                <span style={{ color: "inherit" }}>{userLabel}</span>
              </Space>
            </Button>
          </Dropdown>
        </div>
      </Header>

      {/* ✅ 关键：中间区域固定高度；侧边栏不随内容滚动 */}
      <Layout className="app-body">
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

        {/* ✅ 关键：Content 自己滚动（不要再套一层 div.app-content） */}
        <Content
          className="app-content"
          style={{ padding: isMobile ? 12 : 16 }}
        >
          <Outlet />
        </Content>
      </Layout>

      <Footer className="app-footer">
        © {new Date().getFullYear()} 苏州大学计算机科学与技术学院 ·
        研究生会活动管理系统
      </Footer>
    </Layout>
  );
}
