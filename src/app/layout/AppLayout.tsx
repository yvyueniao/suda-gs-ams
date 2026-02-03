import { useMemo } from "react";
import { Layout, Menu, Typography, Dropdown, Spin, message } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import type { MenuNode } from "../../features/auth/types";
import { MENU_KEY_TO_PATH, pathToMenuKey } from "../menu/menuMap";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { useLogout } from "../../features/auth/hooks/useLogout";

const { Header, Sider, Content } = Layout;

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
    label: n.label,
    children: n.children?.length ? buildAntdMenuItems(n.children) : undefined,
  }));
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 初始化逻辑解耦：user/menu/loading/error 全部从 hook 来
  const { user, menuTree, loading } = useAppBootstrap();

  // ✅ 退出逻辑解耦
  const { logout } = useLogout();

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
  };

  // 右上角下拉：个人中心 / 退出
  const dropdownItems: MenuProps["items"] = [
    { key: "profile", label: "个人中心" },
    { type: "divider" },
    { key: "logout", label: "退出" },
  ];

  const onDropdownClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "profile") navigate("/profile");
    if (key === "logout") logout(true); // ✅ 需要确认弹窗
  };

  if (loading) return <Spin fullscreen />;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          苏大计算机学院研究生会活动管理系统
        </Typography.Title>

        <Dropdown
          menu={{ items: dropdownItems, onClick: onDropdownClick }}
          trigger={["click"]}
        >
          <Typography.Text style={{ color: "#fff", cursor: "pointer" }}>
            {user?.name ?? "未登录"}（{user ? roleLabel(user.role) : "-"}）
          </Typography.Text>
        </Dropdown>
      </Header>

      <Layout>
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={onMenuClick}
            style={{ height: "100%" }}
          />
        </Sider>

        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
