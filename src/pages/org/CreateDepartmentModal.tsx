// src/pages/org/CreateDepartmentModal.tsx

/**
 * CreateDepartmentModal
 *
 * 职责：
 * - 新建部门弹窗（纯 UI + 异步按钮）
 *
 * 约定：
 * - 业务逻辑（createDepartment）由父组件传入
 * - loading / toast / 错误口径统一走 shared/actions/useAsyncAction
 * - 成功后由父组件负责 reload 表格
 */

import { useEffect } from "react";
import { Modal, Form, Input } from "antd";

import { useAsyncAction } from "../../shared/actions";

export type CreateDepartmentModalProps = {
  open: boolean;
  onCancel: () => void;

  /** 创建成功后回调（父组件可在这里 reload 表格） */
  onSuccess?: () => void;

  /** 实际创建函数（来自 useDepartmentManage） */
  createDepartment: (department: string) => Promise<unknown>;
};

type FormValues = {
  department: string;
};

export default function CreateDepartmentModal({
  open,
  onCancel,
  onSuccess,
  createDepartment,
}: CreateDepartmentModalProps) {
  const [form] = Form.useForm<FormValues>();

  /**
   * ✅ 异步动作（统一 loading + toast + ApiError 处理）
   * ✅ 提示信息：优先使用后端返回值（data/msg），为空再兜底
   */
  const action = useAsyncAction({
    successMessage: (_result) => String(_result ?? "").trim() || "创建成功",
    errorMessage: "创建失败",
  });

  /**
   * 关闭时重置表单
   */
  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  /**
   * 点击确定
   */
  const handleOk = async () => {
    const values = await form.validateFields();

    try {
      // ✅ 返回后端结果，让 successMessage 能拿到 _result
      await action.run(async () => {
        return await createDepartment(values.department);
      });

      // ✅ 只有成功才关闭弹窗 + 回调
      onCancel();
      onSuccess?.();
    } catch {
      // ❌ 失败：toast 已由 useAsyncAction 统一处理，这里不关弹窗
    }
  };

  return (
    <Modal
      title="新建部门"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={action.loading}
      destroyOnClose
    >
      <Form<FormValues> form={form} layout="vertical">
        <Form.Item
          name="department"
          label="部门名称"
          rules={[
            { required: true, message: "请输入部门名称" },
            { max: 20, message: "部门名称不能超过 20 个字符" },
          ]}
        >
          <Input placeholder="请输入部门名称" allowClear maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
