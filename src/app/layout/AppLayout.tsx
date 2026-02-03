import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Typography, Dropdown, Modal, Spin, message } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { getMenuList, getUserInfo } from "../../features/auth/api";
import type { MenuNode, User } from "../../features/auth/types";
import { ApiError } from "../../shared/http/error";
import { clearToken } from "../../shared/session/token";
import { getUser, setUser, clearUser } from "../../shared/session/session";

import { MENU_KEY_TO_PATH, pathToMenuKey } from "../menu/menuMap";

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
    key: n.key, // ✅ 用后端 key，当作 Menu 的 key
    label: n.label,
    children: n.children?.length ? buildAntdMenuItems(n.children) : undefined,
  }));
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 优先用本地缓存的 user，避免一进来空白闪一下
  const [user, setUserState] = useState<User | null>(() => getUser());
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) 初始化：拉用户信息 + 菜单
  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        setLoading(true);

        // ✅ /user/info：拿真实用户信息（后端可能刷新 token）
        const info = await getUserInfo();
        if (!alive) return;

        setUser(info.user);
        setUserState(info.user);

        // ✅ /menuList：拿真实菜单（树结构）
        const menus = await getMenuList();
        if (!alive) return;

        setMenuTree(menus);
      } catch (err) {
        // token 失效等情况，RequireAuth 会兜底跳转
        if (err instanceof ApiError) {
          message.error(err.message);
        } else {
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

  const menuItems = useMemo(() => buildAntdMenuItems(menuTree), [menuTree]);

  // 2) 菜单高亮：pathname -> 后端 menu key
  const selectedKeys = useMemo(() => {
    const key = pathToMenuKey(location.pathname);
    return key ? [key] : [];
  }, [location.pathname]);

  // 3) 点击菜单：后端 key -> 前端路由 path
  const onMenuClick: MenuProps["onClick"] = (e) => {
    const key = String(e.key);
    const path = MENU_KEY_TO_PATH[key];
    if (!path) {
      message.warning("该菜单未配置路由映射");
      return;
    }
    navigate(path);
  };

  // 4) 右上角下拉：个人中心 / 退出
  const dropdownItems: MenuProps["items"] = [
    { key: "profile", label: "个人中心" },
    { type: "divider" },
    { key: "logout", label: "退出" },
  ];

  const doLogout = () => {
    Modal.confirm({
      title: "确认退出登录？",
      content: "退出后需要重新登录才能使用系统功能。",
      okText: "退出",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        clearToken();
        clearUser();
        message.success("已退出登录");
        navigate("/login", { replace: true });
      },
    });
  };

  const onDropdownClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "profile") navigate("/profile");
    if (key === "logout") doLogout();
  };

  // ✅ 初始化时给 loading，避免菜单空白闪烁
  if (loading) return <Spin fullscreen />;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ===== Header ===== */}
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

        {/* Header 右侧：真实用户信息 + 下拉 */}
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
        {/* ===== Sider ===== */}
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={onMenuClick}
            style={{ height: "100%" }}
          />
        </Sider>

        {/* ===== Content ===== */}
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
