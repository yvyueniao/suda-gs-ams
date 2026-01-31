import { Card, Typography } from "antd";

export default function FeedbackAdminPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        反馈处理
      </Typography.Title>

      <Typography.Paragraph>
        面向管理侧：查看全部反馈、分派负责人、回复与流转状态（处理中/已完成/已关闭等）。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 全量反馈列表（支持分派/回复/关闭）
        <br />
        - 反馈详情（对话 + 操作区）
        <br />- 处理记录与操作日志联动
      </Typography.Paragraph>
    </Card>
  );
}
