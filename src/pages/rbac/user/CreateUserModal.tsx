// src/pages/rbac/user/CreateUserModal.tsx

/**
 * CreateUserModal
 *
 * ✅ 页面层组件（UI）
 * - 只负责渲染 Modal + Form
 * - 不直接请求接口；提交动作由父层注入（useUserManagePage / useAsyncAction）
 * - password：按你要求“不加密”，直接原样提交
 */

import { useEffect } from "react";
import { Modal, Form, Input } from "antd";

import type { UserCreatePayload } from "../../../features/rbac/user/types";

export type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;

  /** 提交 loading（由页面层 useAsyncAction 管） */
  submitting?: boolean;

  /** 提交回调（父层注入，features 侧只做 request） */
  onSubmit: (payload: UserCreatePayload) => void | Promise<unknown>;
};

export default function CreateUserModal(props: CreateUserModalProps) {
  const { open, onClose, submitting, onSubmit } = props;

  const [form] = Form.useForm<UserCreatePayload>();

  // 打开时重置，避免上次残留
  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  return (
    <Modal
      title="创建用户"
      open={open}
      onCancel={onClose}
      okText="创建"
      cancelText="取消"
      confirmLoading={!!submitting}
      destroyOnClose
      maskClosable={false}
      onOk={() => {
        void form
          .validateFields()
          .then(async (vals) => {
            await onSubmit(vals);
          })
          .catch(() => void 0);
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="学号"
          name="username"
          rules={[
            { required: true, message: "请输入学号" },
            { whitespace: true, message: "学号不能为空" },
          ]}
        >
          <Input placeholder="请输入学号" maxLength={32} />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: "请输入密码" },
            { whitespace: true, message: "密码不能为空" },
          ]}
        >
          <Input.Password placeholder="请输入密码" maxLength={64} />
        </Form.Item>

        <Form.Item
          label="姓名"
          name="name"
          rules={[
            { required: true, message: "请输入姓名" },
            { whitespace: true, message: "姓名不能为空" },
          ]}
        >
          <Input placeholder="请输入姓名" maxLength={32} />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: "请输入邮箱" },
            { type: "email", message: "邮箱格式不正确" },
          ]}
        >
          <Input placeholder="例如：xxx@suda.edu.cn" maxLength={64} />
        </Form.Item>

        <Form.Item
          label="专业"
          name="major"
          rules={[
            { required: true, message: "请输入专业" },
            { whitespace: true, message: "专业不能为空" },
          ]}
        >
          <Input placeholder="请输入专业" maxLength={64} />
        </Form.Item>

        <Form.Item
          label="年级"
          name="grade"
          normalize={(val) => String(val ?? "").trim()}
          rules={[
            { required: true, message: "请输入年级" },
            { whitespace: true, message: "年级不能为空" },
            {
              validator: async (_, value) => {
                const v = String(value ?? "").trim();
                if (!v) return;

                // 格式：YYYY-硕 或 YYYY-博
                const match = /^(\d{4})-(硕|博)$/.exec(v);
                if (!match) {
                  throw new Error(
                    "年级格式应为：YYYY-硕 或 YYYY-博（例如：2024-硕）",
                  );
                }

                // 可选：年份合理性校验
                const year = Number(match[1]);
                if (year < 2000 || year > 2100) {
                  throw new Error(
                    "入学年份不合法，请填写 2000-2100 之间的年份",
                  );
                }
              },
            },
          ]}
        >
          <Input placeholder="例如：2024-硕 / 2024-博" maxLength={16} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
