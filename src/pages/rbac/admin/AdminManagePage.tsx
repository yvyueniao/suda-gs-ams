import { Card, Typography } from "antd";

/**
 * 管理员管理（RBAC - Admin）
 * 占位页：后续在这里实现管理员角色、权限分配等
 */
export default function AdminManagePage() {
  return (
    <Card>
      <Typography.Title level={4}>管理员管理</Typography.Title>
      <Typography.Paragraph type="secondary">
        这里将用于管理管理员账号及其角色与权限配置。
      </Typography.Paragraph>
    </Card>
  );
}
