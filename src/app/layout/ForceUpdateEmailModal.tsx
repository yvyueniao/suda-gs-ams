import { Form, Input, Modal, Typography } from "antd";

import { getStrongPasswordError } from "../../shared/utils/accountValidation";

type ForceUpdateAccountPayload = {
  email: string;
  oldPassword: string;
  newPassword1: string;
  newPassword2: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialEmail: string;
  onSubmit: (payload: ForceUpdateAccountPayload) => Promise<unknown> | void;
};

export default function ForceUpdateEmailModal({
  open,
  loading,
  initialEmail,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<ForceUpdateAccountPayload>();

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
        let values: ForceUpdateAccountPayload;
        try {
          values = await form.validateFields();
        } catch {
          return;
        }
        await Promise.resolve(onSubmit(values));
      }}
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          form.setFieldsValue({
            email: "",
            oldPassword: "",
            newPassword1: "",
            newPassword2: "",
          });
        } else {
          form.resetFields();
        }
      }}
    >
      <Typography.Paragraph style={{ marginBottom: 12 }}>
        检测到您当前邮箱为系统初始邮箱（{initialEmail}），请同时修改邮箱和密码后继续。提交成功后系统将自动退出登录。
      </Typography.Paragraph>

      <Form form={form} layout="vertical">
        <Form.Item
          name="email"
          label="新邮箱"
          rules={[{ required: true, message: "请输入正确邮箱" }]}
        >
          <Input placeholder="请输入可用邮箱" />
        </Form.Item>

        <Form.Item
          name="oldPassword"
          label="当前密码"
          rules={[{ required: true, message: "请输入当前密码" }]}
        >
          <Input.Password placeholder="请输入当前密码" />
        </Form.Item>

        <Form.Item
          name="newPassword1"
          label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            {
              validator: async (_, value) => {
                const msg = getStrongPasswordError(String(value ?? ""));
                if (msg) throw new Error(msg);
              },
            },
          ]}
        >
          <Input.Password placeholder="请设置新密码" />
        </Form.Item>

        <Form.Item
          name="newPassword2"
          label="确认新密码"
          dependencies={["newPassword1"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const p1 = getFieldValue("newPassword1");
                if (!value || value === p1) return Promise.resolve();
                return Promise.reject(new Error("两次输入的新密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
