import { Card, Typography } from "antd";

export default function EnrollPage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        活动/讲座报名
      </Typography.Title>

      <Typography.Paragraph>
        面向普通用户的报名入口：展示可报名活动、查看详情、执行报名/取消报名等动作。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 活动列表（筛选：时间/状态/关键词）
        <br />
        - 活动详情 Drawer/Modal
        <br />- 报名按钮（需登录；名额不足走候补）
      </Typography.Paragraph>
    </Card>
  );
}
