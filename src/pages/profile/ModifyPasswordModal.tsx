// src/pages/profile/ModifyPasswordModal.tsx
/**
 * ModifyPasswordModal
 *
 * ✅ 文件定位
 * - “个人中心”页面的「修改密码」弹窗（纯 UI 组件）
 *
 * ✅ 负责什么
 * - 展示表单 + 校验（包含两次新密码一致性校验）
 * - 点击确定时把表单值交给外部 onSubmit
 * - 打开/关闭时清理表单
 *
 * ✅ 不负责什么
 * - 不直接调用 API
 * - 不做 message/toast
 * - 不管理 open 状态（由父组件控制）
 *
 * ✅ 本次修复
 * - 放宽 onSubmit 返回类型：void | Promise<unknown>
 * - onOk 中使用 Promise.resolve 包装，兼容 void / Promise<any>
 */

import { Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { FormInstance } from "antd/es/form";
import type { MutableRefObject } from "react";

import type { ModifyPasswordPayload } from "../../features/profile/types";

type Props = {
  open: boolean;
  confirmLoading?: boolean;

  onCancel: () => void;

  /**
   * ✅ 放宽返回类型
   * 避免 Promise<unknown> 无法赋值给 Promise<void> 的类型报错
   */
  onSubmit: (payload: ModifyPasswordPayload) => void | Promise<unknown>;

  /** 可选：外部想拿到 form 实例 */
  formRef?: MutableRefObject<FormInstance<ModifyPasswordPayload> | null>;
};

export default function ModifyPasswordModal({
  open,
  confirmLoading,
  onCancel,
  onSubmit,
  formRef,
}: Props) {
  const [form] = Form.useForm<ModifyPasswordPayload>();

  /**
   * ✅ 打开/关闭都清空表单
   * - 避免上一次输入残留
   * - destroyOnClose 也会销毁，但这里双保险
   */
  useEffect(() => {
    form.resetFields();
  }, [open, form]);

  /**
   * ✅ 透传 form 实例（可选）
   */
  useEffect(() => {
    if (formRef) {
      formRef.current = form;
    }
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
          // 表单校验失败，直接拦截
          return;
        }

        // ✅ 关键：兼容 void / Promise<any>
        await Promise.resolve(onSubmit(values));
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
                if (!value || value === p1) {
                  return Promise.resolve();
                }
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
