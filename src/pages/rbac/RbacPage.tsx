import { Card, Typography } from "antd";

export default function RbacPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        用户与权限（RBAC）
      </Typography.Title>

      <Typography.Paragraph>
        面向主席/超管：用户管理、管理员管理、角色分配、批量导入导出等。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 用户列表（搜索/筛选/启用禁用）
        <br />
        - 角色分配（普通/干事/部长/主席/超管）
        <br />- 批量导入（Excel/CSV）与导出
      </Typography.Paragraph>
    </Card>
  );
}
