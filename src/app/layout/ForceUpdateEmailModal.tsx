import { Form, Input, Modal, Typography } from "antd";

import type { UpdateEmailPayload } from "../../features/profile/types";

type Props = {
  open: boolean;
  loading?: boolean;
  initialEmail: string;
  onSubmit: (payload: UpdateEmailPayload) => Promise<unknown> | void;
};

export default function ForceUpdateEmailModal({
  open,
  loading,
  initialEmail,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<UpdateEmailPayload>();

  return (
    <Modal
      title="请先完善邮箱信息"
      open={open}
      closable={false}
      keyboard={false}
      maskClosable={false}
      cancelButtonProps={{ style: { display: "none" } }}
      okText="确认修改"
      okButtonProps={{ loading }}
      onOk={async () => {
        let values: UpdateEmailPayload;
        try {
          values = await form.validateFields();
        } catch {
          return;
        }
        await Promise.resolve(onSubmit(values));
      }}
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          form.setFieldsValue({ email: "" });
        } else {
          form.resetFields();
        }
      }}
    >
      <Typography.Paragraph style={{ marginBottom: 12 }}>
        检测到您当前邮箱为系统初始邮箱（{initialEmail}）。请立即修改为本人可用邮箱，修改成功后将自动退出登录。
      </Typography.Paragraph>

      <Form form={form} layout="vertical">
        <Form.Item
          name="email"
          label="新邮箱"
          rules={[{ required: true, message: "请输入正确邮箱" }]}
        >
          <Input placeholder="请输入可用邮箱" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
