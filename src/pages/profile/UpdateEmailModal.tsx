// src/pages/profile/UpdateEmailModal.tsx
import { Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { FormInstance } from "antd/es/form";

import type { UpdateEmailPayload } from "../../features/profile/types";

type Props = {
  open: boolean;
  initialEmail?: string;

  confirmLoading?: boolean;

  onCancel: () => void;
  onSubmit: (payload: UpdateEmailPayload) => Promise<void> | void;

  /** 可选：外部想拿到 form（比如调试/埋点/联动） */
  formRef?: React.MutableRefObject<FormInstance<UpdateEmailPayload> | null>;
};

export default function UpdateEmailModal({
  open,
  initialEmail,
  confirmLoading,
  onCancel,
  onSubmit,
  formRef,
}: Props) {
  const [form] = Form.useForm<UpdateEmailPayload>();

  // ✅ 打开时回填；关闭时清理
  useEffect(() => {
    if (open) {
      form.setFieldsValue({ email: initialEmail ?? "" });
    } else {
      form.resetFields();
    }
  }, [open, initialEmail, form]);

  useEffect(() => {
    if (formRef) formRef.current = form;
  }, [form, formRef]);

  return (
    <Modal
      title="修改邮箱"
      open={open}
      onCancel={onCancel}
      onOk={async () => {
        let values: UpdateEmailPayload;
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
          name="email"
          label="新邮箱"
          rules={[
            { required: true, message: "请输入邮箱" },
            { type: "email", message: "邮箱格式不正确" },
          ]}
        >
          <Input placeholder="example@suda.edu.cn" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
