// src/pages/rbac/user/ImportUsersModal.tsx

import { useMemo } from "react";
import {
  Modal,
  Upload,
  Typography,
  Card,
  Descriptions,
  Alert,
  Spin,
} from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Text } = Typography;

export type ImportPreviewStats = {
  total: number;
  emptyRequiredCount: number;
  duplicateUsernameCount: number;
};

export type ImportUsersModalProps = {
  open: boolean;
  onClose: () => void;

  parsing?: boolean;
  submitting?: boolean;

  /** ✅ 来自 useUserImportFlow.preview.stats */
  previewStats: ImportPreviewStats | null;

  /** 选择文件后回调（父层解析） */
  onFileSelected: (file: File) => void | Promise<unknown>;

  /** 点击“确认导入” */
  onConfirmImport: () => void | Promise<unknown>;
};

export default function ImportUsersModal(props: ImportUsersModalProps) {
  const {
    open,
    onClose,
    parsing,
    submitting,
    previewStats,
    onFileSelected,
    onConfirmImport,
  } = props;

  const stats = useMemo(() => {
    return {
      total: previewStats?.total ?? 0,
      emptyRequiredCount: previewStats?.emptyRequiredCount ?? 0,
      duplicateUsernameCount: previewStats?.duplicateUsernameCount ?? 0,
    };
  }, [previewStats]);

  const hasParsedRows = stats.total > 0;
  const importableCount = Math.max(0, stats.total - stats.emptyRequiredCount);

  const uploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: ".xls,.xlsx",
    beforeUpload: async (file) => {
      // ✅ 阻止 antd 自动上传；交给父层解析
      await onFileSelected(file as File);
      return false;
    },
    showUploadList: true,
  };

  return (
    <Modal
      title="批量导入用户"
      open={open}
      onCancel={onClose}
      okText="确认导入"
      cancelText="取消"
      confirmLoading={!!submitting}
      okButtonProps={{
        disabled: !hasParsedRows || !!parsing,
      }}
      onOk={() => void onConfirmImport()}
      destroyOnClose
      maskClosable={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Alert
          type="info"
          showIcon
          message="请上传 xls/xlsx 文件（模板固定中文表头：学号/密码/姓名/邮箱/专业/年级）"
        />

        <Upload.Dragger {...uploadProps} disabled={!!parsing || !!submitting}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">仅解析第一张表（第一个 sheet）</p>
        </Upload.Dragger>

        <Card size="small" title="解析统计（预览校验）">
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                key: "total",
                label: "总行数",
                children: <Text strong>{stats.total}</Text>,
              },
              {
                key: "importable",
                label: "可导入行数",
                children: <Text strong>{importableCount}</Text>,
              },
              {
                key: "emptyRequired",
                label: "必填缺失",
                children: <Text strong>{stats.emptyRequiredCount}</Text>,
              },
              {
                key: "dup",
                label: "重复学号",
                children: <Text strong>{stats.duplicateUsernameCount}</Text>,
              },
            ]}
          />

          {hasParsedRows ? (
            <Alert
              style={{ marginTop: 12 }}
              type={
                stats.emptyRequiredCount > 0 || stats.duplicateUsernameCount > 0
                  ? "warning"
                  : "success"
              }
              showIcon
              message={
                stats.emptyRequiredCount > 0 || stats.duplicateUsernameCount > 0
                  ? "检测到部分数据问题，仍可继续导入（建议先修正）"
                  : "数据校验通过，可以导入"
              }
            />
          ) : (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message={
                parsing ? (
                  <span>
                    正在解析中 <Spin size="small" style={{ marginLeft: 8 }} />
                  </span>
                ) : (
                  "尚未解析到有效数据：请先上传文件"
                )
              }
            />
          )}
        </Card>
      </div>
    </Modal>
  );
}
