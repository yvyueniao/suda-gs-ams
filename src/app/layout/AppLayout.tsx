import { Layout, Menu, Typography } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;

/**
 * 【写死的当前用户】
 * ⚠️ 后续直接替换成：从接口 / context / store 获取
 */
const currentUser = {
  id: "u001",
  name: "张三",
  role: "部长", // 普通用户 | 干事 | 部长 | 主席 | 超管
};

/**
 * 【写死的菜单配置】
 * ⚠️ 后续可：
 * 1. 根据 role 过滤
 * 2. 改成后端返回
 * 3. 挪到独立的 menuConfig 文件
 */
const menuItems = [
  { key: "/", label: "首页" },
  { key: "/enroll", label: "活动报名" },
  { key: "/activity-admin", label: "活动管理" },
  { key: "/feedback-center", label: "反馈中心" },
  { key: "/feedback-admin", label: "反馈处理" },
  { key: "/profile", label: "个人中心" },
  { key: "/rbac", label: "用户与权限" },
  { key: "/org", label: "组织架构" },
  { key: "/audit", label: "操作日志" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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
          SUDA GS AMS
        </Typography.Title>

        {/* Header 右侧：写死的用户信息 */}
        <Typography.Text style={{ color: "#fff" }}>
          {currentUser.name}（{currentUser.role}）
        </Typography.Text>
      </Header>

      <Layout>
        {/* ===== Sider ===== */}
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={(e) => navigate(e.key)}
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
