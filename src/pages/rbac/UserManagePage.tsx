import { Card, Typography } from "antd";

/**
 * 用户管理（RBAC - User）
 * 占位页：后续在这里实现用户列表、搜索、批量操作等
 */
export default function UserManagePage() {
  return (
    <Card>
      <Typography.Title level={4}>用户管理</Typography.Title>
      <Typography.Paragraph type="secondary">
        这里将用于管理系统中的普通用户信息（查看、搜索、禁用、重置等）。
      </Typography.Paragraph>
    </Card>
  );
}
