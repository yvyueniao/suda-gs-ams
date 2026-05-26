// src/pages/feedback/CreateFeedbackModal.tsx
//
// CreateFeedbackModal（UI 组件）
//
// 职责：
// - 仅负责：展示“创建反馈”弹窗
// - 表单校验（title 必填）
// - 调用 onSubmit
//
// 约定：
// - ❌ 不直接调用 API
// - ❌ 不做 message / toast
// - ❌ 不做 reload
// - ✅ loading 由父组件控制
// - ✅ 提交成功后由父组件决定是否关闭

import { useEffect } from "react";
import { Button, Form, Input, Modal, Upload } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";

import type { CreateFeedbackDraftPayload } from "../../features/feedback/types";

const { TextArea } = Input;

export type CreateFeedbackModalProps = {
  open: boolean;
  loading?: boolean;

  onCancel: () => void;

  /**
   * 返回 true 才会自动关闭
   * 返回 false 或抛错：不关闭（交给页面层提示）
   */
  onSubmit: (payload: CreateFeedbackDraftPayload) => Promise<boolean> | boolean;
};

export default function CreateFeedbackModal(props: CreateFeedbackModalProps) {
  const { open, loading = false, onCancel, onSubmit } = props;

  const [form] = Form.useForm<CreateFeedbackDraftPayload & { fileList?: UploadFile[] }>();

  // 打开时重置表单
  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const file = values.fileList?.[0]?.originFileObj;
      const ok = await onSubmit({
        title: values.title,
        content: values.content,
        file,
      });
      if (ok) {
        form.resetFields();
      }
    } catch {
      // 校验失败不处理（antd 自动提示）
    }
  };

  const uploadProps: UploadProps = {
    accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg",
    maxCount: 1,
    beforeUpload: () => false,
  };

  return (
    <Modal
      title="创建反馈"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
      okText="提交"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="反馈标题"
          name="title"
          rules={[
            { required: true, message: "请输入反馈标题" },
            { max: 100, message: "标题不能超过 100 个字符" },
          ]}
        >
          <TextArea
            placeholder="请简要描述你的问题，例如：社会活动分数出错"
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={100}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="反馈正文"
          name="content"
          rules={[
            { required: true, message: "请输入反馈正文" },
            { max: 2000, message: "正文不能超过 2000 个字符" },
          ]}
        >
          <TextArea
            placeholder="请详细描述你遇到的问题、期望结果和复现步骤"
            autoSize={{ minRows: 4, maxRows: 8 }}
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item label="上传附件（可选）" name="fileList" valuePropName="fileList">
          <Upload {...uploadProps}>
            <Button>选择附件</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
