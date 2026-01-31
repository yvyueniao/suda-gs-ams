import { Card, Typography } from "antd";

export default function AuditPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        操作日志
      </Typography.Title>

      <Typography.Paragraph>
        记录系统关键操作：谁在什么时候对活动/反馈/用户做了什么（便于追溯与审计）。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 日志列表（筛选：模块/操作者/时间）
        <br />
        - 日志详情（操作前后对比，可选）
        <br />- 导出
      </Typography.Paragraph>
    </Card>
  );
}
