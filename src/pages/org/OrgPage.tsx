import { Card, Typography } from "antd";

export default function OrgPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        组织架构（部门管理）
      </Typography.Title>

      <Typography.Paragraph>
        面向主席/超管：维护研究生会部门、岗位、成员归属关系，供活动分派与权限使用。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 部门树/列表（新增/编辑/删除）
        <br />
        - 部门成员管理（加入/移除/设置职位）
        <br />- 与活动“负责人/协办部门”字段联动
      </Typography.Paragraph>
    </Card>
  );
}
