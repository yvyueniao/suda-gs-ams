import { Card, Typography } from "antd";

export default function ProfilePage() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        个人中心
      </Typography.Title>

      <Typography.Paragraph>
        展示个人信息与我的数据：我的报名、我的反馈、账号设置等。
      </Typography.Paragraph>

      <Typography.Title level={5}>下一步</Typography.Title>
      <Typography.Paragraph>
        - 当前用户信息（姓名/学号/部门/角色）
        <br />
        - 我的报名记录（可取消/查看二维码等按需求扩展）
        <br />
        - 我的反馈记录
        <br />- 退出登录
      </Typography.Paragraph>
    </Card>
  );
}
