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
  Button,
  Space,
} from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";

const { Text, Link } = Typography;

export type ImportPreviewStats = {
  total: number;
  emptyRequiredCount: number;
  duplicateUsernameCount: number;

  /** ✅ 新增：年级格式不合格 */
  invalidGradeCount: number;
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

/**
 * ✅ 导入模板下载地址
 * - 模板文件建议放在：public/templates/user-import-template.xlsx
 * - Vite 会把 public 下的文件原样拷贝，访问路径以 / 开头
 */
const TEMPLATE_URL = "/templates/user-import-template.xlsx";

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
      invalidGradeCount: previewStats?.invalidGradeCount ?? 0,
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

  const disabled = !!parsing || !!submitting;

  const hasAnyIssue =
    stats.emptyRequiredCount > 0 ||
    stats.duplicateUsernameCount > 0 ||
    stats.invalidGradeCount > 0;

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
          message={
            <Space direction="vertical" size={4}>
              <Text>
                请上传 xls/xlsx
                文件（模板固定中文表头：学号/密码/姓名/邮箱/专业/年级）
              </Text>

              {/* ✅ 新增：下载导入模板 */}
              <Space size={8} wrap>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  href={TEMPLATE_URL}
                  target="_blank"
                  rel="noreferrer"
                  download
                  disabled={disabled}
                  style={{ padding: 0 }}
                >
                  下载导入模板
                </Button>

                <Text type="secondary">
                  若无法下载，可复制打开：
                  <Link
                    href={TEMPLATE_URL}
                    target="_blank"
                    rel="noreferrer"
                    disabled={disabled}
                  >
                    {TEMPLATE_URL}
                  </Link>
                </Text>
              </Space>
            </Space>
          }
        />

        <Upload.Dragger {...uploadProps} disabled={disabled}>
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
              {
                key: "gradeInvalid",
                label: "年级格式不合格",
                children: <Text strong>{stats.invalidGradeCount}</Text>,
              },
            ]}
          />

          {hasParsedRows ? (
            <Alert
              style={{ marginTop: 12 }}
              type={hasAnyIssue ? "warning" : "success"}
              showIcon
              message={
                hasAnyIssue
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
