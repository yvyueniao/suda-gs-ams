// src/pages/profile/UpdateEmailModal.tsx
/**
 * UpdateEmailModal
 *
 * ✅ 文件定位
 * - “个人中心”页面的「修改邮箱」弹窗（纯 UI 组件）
 *
 * ✅ 负责什么
 * - 展示表单 + 校验（Form.validateFields）
 * - 点击确定时把表单值交给外部 onSubmit
 * - 打开时回填 initialEmail，关闭时清理表单
 *
 * ✅ 不负责什么（保持解耦）
 * - 不直接调用 API
 * - 不做 message/toast（成功失败提示交给页面或业务 Hook）
 * - 不管理 open 状态（由父组件控制）
 *
 * ✅ 本次修复（解决 Promise<unknown> vs Promise<void> 报错）
 * - 放宽 onSubmit 返回类型：void | Promise<unknown>
 * - onOk 中用 Promise.resolve 包一层，兼容 void / Promise 两种返回
 */

import { Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { FormInstance } from "antd/es/form";
import type { MutableRefObject } from "react";

import type { UpdateEmailPayload } from "../../features/profile/types";

type Props = {
  open: boolean;
  initialEmail?: string;

  confirmLoading?: boolean;

  onCancel: () => void;

  /**
   * ✅ 放宽返回类型
   * - 业务侧允许返回：void / string / null / OperationResult / unknown
   * - 组件只负责 await 其完成，不消费返回值
   */
  onSubmit: (payload: UpdateEmailPayload) => void | Promise<unknown>;

  /** 可选：外部想拿到 form（比如调试/埋点/联动） */
  formRef?: MutableRefObject<FormInstance<UpdateEmailPayload> | null>;
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

  // ✅ 透传 form 实例（可选）
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

        // ✅ 兼容 onSubmit 返回 void / Promise<any>
        await Promise.resolve(onSubmit(values));
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
