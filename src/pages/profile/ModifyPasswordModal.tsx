// src/pages/profile/ModifyPasswordModal.tsx
import { Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { FormInstance } from "antd/es/form";

import type { ModifyPasswordPayload } from "../../features/profile/types";

type Props = {
  open: boolean;

  confirmLoading?: boolean;

  onCancel: () => void;
  onSubmit: (payload: ModifyPasswordPayload) => Promise<void> | void;

  /** 可选：外部想拿到 form（比如调试/埋点/联动） */
  formRef?: React.MutableRefObject<FormInstance<ModifyPasswordPayload> | null>;
};

export default function ModifyPasswordModal({
  open,
  confirmLoading,
  onCancel,
  onSubmit,
  formRef,
}: Props) {
  const [form] = Form.useForm<ModifyPasswordPayload>();

  // ✅ 打开时清空；关闭时清理
  useEffect(() => {
    if (open) {
      form.resetFields();
    } else {
      form.resetFields();
    }
  }, [open, form]);

  useEffect(() => {
    if (formRef) formRef.current = form;
  }, [form, formRef]);

  return (
    <Modal
      title="修改密码"
      open={open}
      onCancel={onCancel}
      onOk={async () => {
        let values: ModifyPasswordPayload;
        try {
          values = await form.validateFields();
        } catch {
          return;
        }
        await onSubmit(values);
      }}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="oldPassword"
          label="旧密码"
          rules={[{ required: true, message: "请输入旧密码" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="newPassword1"
          label="新密码"
          rules={[{ required: true, message: "请输入新密码" }]}
        >
          <Input.Password />
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
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
}
