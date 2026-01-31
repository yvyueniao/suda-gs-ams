import { Card, Typography } from "antd";

export default function FeedbackCenterPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        反馈中心
      </Typography.Title>

      <Typography.Paragraph>
        面向所有用户：提交反馈、查看反馈处理进度与回复记录。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 我的反馈列表（筛选：状态/时间/关键词）
        <br />
        - 新建反馈 Modal（标题、内容、可选附件）
        <br />- 反馈详情页/抽屉（对话式回复）
      </Typography.Paragraph>
    </Card>
  );
}
