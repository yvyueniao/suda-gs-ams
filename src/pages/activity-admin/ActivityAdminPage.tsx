import { Card, Typography } from "antd";

export default function ActivityAdminPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        活动管理
      </Typography.Title>

      <Typography.Paragraph>
        面向干事/部长/主席的管理视角：创建、编辑、发布活动，管理报名名单，导出数据等。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 活动管理列表（管理视角字段更全）
        <br />
        - 新建/编辑活动 Modal
        <br />
        - 报名名单查看与导出
        <br />- 权限差异：干事仅看负责活动，部长可指派，主席/超管全量
      </Typography.Paragraph>
    </Card>
  );
}
