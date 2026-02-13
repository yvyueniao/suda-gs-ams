// src/pages/activity-apply/SupplementApplyModal.tsx

import { useMemo } from "react";
import { Alert, Form, Input, Modal, Space, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";

/**
 * SupplementApplyModal（补报名弹窗）
 *
 * 说明：
 * - 当前补报名业务“未对接后端”，因此本弹窗只做 UI 壳 + 表单占位
 * - 页面层可控制 open/close，并在 onOk 里先做占位提示（例如 message.info）
 *
 * 约定：
 * - ✅ 不依赖 features（避免循环依赖）
 * - ✅ 表单字段先按“可能会用到的最小集合”占位：说明 + 附件
 */

export type SupplementApplyPayload = {
  reason: string;
  /** 仅占位：未来对接后端时传 url 或 fileId */
  attachment?: unknown;
};

export type SupplementApplyModalProps = {
  open: boolean;
  activityName?: string;
  onCancel: () => void;
  /** 目前不做真实提交，先让页面层决定怎么处理 */
  onSubmit?: (payload: SupplementApplyPayload) => Promise<void> | void;
};

export default function SupplementApplyModal(props: SupplementApplyModalProps) {
  const { open, activityName, onCancel, onSubmit } = props;

  const [form] = Form.useForm<SupplementApplyPayload>();

  const title = useMemo(() => {
    if (!activityName) return "补报名";
    return `补报名：${activityName}`;
  }, [activityName]);

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    // 当前不真正上传，先阻止自动上传
    beforeUpload: () => false,
    maxCount: 1,
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    await Promise.resolve(onSubmit?.(values));
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={title}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="提交"
      cancelText="取消"
      destroyOnClose
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          message="补报名功能暂未开放"
          description="当前仅提供弹窗与表单占位，后续对接后端接口后可启用真实提交。"
        />

        <Form
          form={form}
          layout="vertical"
          preserve={false}
          requiredMark
          initialValues={{ reason: "" }}
        >
          <Form.Item
            label="补报名说明"
            name="reason"
            rules={[
              { required: true, message: "请填写补报名说明" },
              { min: 5, message: "至少 5 个字" },
              { max: 200, message: "最多 200 个字" },
            ]}
          >
            <Input.TextArea
              placeholder="请简要说明补报名原因（例如：特殊情况、材料补交等）"
              autoSize={{ minRows: 3, maxRows: 6 }}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="附件（可选）"
            name="attachment"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
          >
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                点击或拖拽文件到此处上传
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                当前不进行真实上传，仅作为占位展示
              </Typography.Text>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
