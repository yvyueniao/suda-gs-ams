import { Card, Typography } from "antd";

export default function HomePage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        首页
      </Typography.Title>

      <Typography.Paragraph>
        这里是系统的总览入口（后续可放：公告、快捷入口、统计卡片）。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 展示当前登录用户与角色
        <br />
        - 提供常用入口（报名 / 活动管理 / 反馈）
        <br />- 可选：活动/反馈数量统计
      </Typography.Paragraph>
    </Card>
  );
}
