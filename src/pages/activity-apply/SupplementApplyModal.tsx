// src/pages/activity-apply/SupplementApplyModal.tsx

import { useEffect, useMemo } from "react";
import {
  Alert,
  AutoComplete,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  Upload,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";

/**
 * SupplementApplyModal（补报名弹窗 - 真实版 UI）
 *
 * 交互要求：
 * 1) 弹窗内输入活动名称（可输入）
 * 2) 输入框下方动态出现下拉选项（模糊匹配），可选择
 * 3) 第一行显示“活动ID”（不可编辑），选择活动后自动回填
 * 4) 必须上传 PDF（必传）
 *
 * ❌ 已删除：补报名说明 reason（后端不接收，表单不再出现）
 *
 * 约定：
 * - ✅ 纯 UI：不拉接口、不写业务逻辑
 * - ✅ 业务逻辑全部由 features/activity-apply/hooks/useSupplementApply 提供
 */

export type SupplementApplySuggestion = {
  id: number;
  name: string;
};

export type SupplementApplyFormValues = {
  activityId: number | null;
  activityName: string;
  fileList: UploadFile[];
};

export type SupplementApplyModalProps = {
  open: boolean;

  // 受控值（来自 hook）
  activityId: number | null;
  activityName: string;
  submitting?: boolean;

  // 下拉候选（来自 hook）
  suggestions: SupplementApplySuggestion[];
  searching?: boolean;

  // 事件（来自 hook）
  onClose: () => void;
  onSearchName: (keyword: string) => void;
  onPickSuggestion: (picked: SupplementApplySuggestion) => void;
  onChangeName: (name: string) => void;
  onChangeFileList: (fileList: UploadFile[]) => void;
  onSubmit: () => Promise<void> | void;
};

function isPdfUploadFile(f: UploadFile) {
  const file = f.originFileObj as File | undefined;
  const byType = file?.type === "application/pdf";
  const byName = String(f.name || "")
    .toLowerCase()
    .endsWith(".pdf");
  return !!(byType || byName);
}

export default function SupplementApplyModal(props: SupplementApplyModalProps) {
  const {
    open,

    activityId,
    activityName,
    submitting,

    suggestions,
    searching,

    onClose,
    onSearchName,
    onPickSuggestion,
    onChangeName,
    onChangeFileList,
    onSubmit,
  } = props;

  const [form] = Form.useForm<SupplementApplyFormValues>();

  // 弹窗打开时：把受控状态同步进表单（不主动覆盖 fileList）
  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      activityId,
      activityName,
      fileList: (form.getFieldValue("fileList") ?? []) as UploadFile[],
    });
  }, [open, activityId, activityName, form]);

  // 关闭时清理表单（校验态 + 值）
  useEffect(() => {
    if (open) return;
    form.resetFields();
  }, [open, form]);

  const title = useMemo(() => "补报名", []);

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: "application/pdf",
    maxCount: 1,
    beforeUpload: () => false, // ✅ 不自动上传（由 hook 统一提交）
  };

  const options = useMemo(() => {
    return suggestions.map((s) => ({
      value: s.name,
      label: (
        <Space size={8}>
          <Typography.Text>{s.name}</Typography.Text>
          <Typography.Text type="secondary">#{s.id}</Typography.Text>
        </Space>
      ),
      _raw: s,
    }));
  }, [suggestions]);

  const handleOk = async () => {
    await form.validateFields();
    await Promise.resolve(onSubmit());
  };

  return (
    <Modal
      open={open}
      title={title}
      onOk={handleOk}
      onCancel={onClose}
      okText="提交"
      cancelText="取消"
      destroyOnClose
      maskClosable={false}
      confirmLoading={!!submitting}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          message="补报名需要上传 PDF"
          description="请选择活动并上传 PDF 附件后提交补报名申请。"
        />

        <Form
          form={form}
          layout="vertical"
          preserve={false}
          requiredMark
          initialValues={{
            activityId: null,
            activityName: "",
            fileList: [],
          }}
        >
          {/* 活动 ID（只读） */}
          <Form.Item label="活动ID" name="activityId">
            <Input disabled placeholder="请选择活动后自动填充" />
          </Form.Item>

          {/* 活动名称：可输入 + 模糊匹配下拉 */}
          <Form.Item
            label="活动名称"
            name="activityName"
            rules={[
              { required: true, message: "请输入活动名称并从下拉中选择" },
              { min: 2, message: "至少 2 个字" },
              { max: 50, message: "最多 50 个字" },
            ]}
          >
            <AutoComplete
              value={activityName}
              options={options as any}
              onSearch={(kw) => {
                onChangeName(kw);
                onSearchName(kw);
              }}
              onChange={(v) => {
                const next = String(v ?? "");
                onChangeName(next);
                onSearchName(next);
              }}
              onSelect={(_value, option: any) => {
                const raw = option?._raw as
                  | SupplementApplySuggestion
                  | undefined;
                if (!raw) return;

                onPickSuggestion(raw);

                // ✅ 表单联动：立即回填 ID + 名称
                form.setFieldsValue({
                  activityId: raw.id,
                  activityName: raw.name,
                });
              }}
              placeholder="输入活动名称（下拉会出现模糊匹配结果）"
              allowClear
              notFoundContent={searching ? "搜索中..." : "无匹配结果"}
            />
          </Form.Item>

          {/* PDF 必传 */}
          <Form.Item
            label="附件（PDF 必传）"
            name="fileList"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList as UploadFile[]}
            rules={[
              {
                validator: async (_, value) => {
                  const list = Array.isArray(value)
                    ? (value as UploadFile[])
                    : [];
                  if (list.length === 0) throw new Error("请上传 PDF 文件");
                  if (!isPdfUploadFile(list[0]))
                    throw new Error("仅支持 PDF 文件");
                },
              },
            ]}
          >
            <Upload.Dragger
              {...uploadProps}
              onChange={(info) => {
                onChangeFileList(info.fileList as UploadFile[]);
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                点击或拖拽 PDF 文件到此处上传
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                仅支持 PDF，且为必传
              </Typography.Text>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
