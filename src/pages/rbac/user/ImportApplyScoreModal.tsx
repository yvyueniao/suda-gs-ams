import { useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  AutoComplete,
  Modal,
  Space,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";

const { Text, Link } = Typography;

export type ApplyScorePreviewStats = {
  total: number;
  validCount: number;
  submitCount: number;
  invalidCount: number;
  duplicateCount: number;
  emptyCount: number;
  invalidUsernameCount: number;
  invalidScoreCount: number;
};

export type ApplyScoreIssueRow = {
  rowNo: number;
  username: string;
  scoreRaw: string;
  errors: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  parsing?: boolean;
  submitting?: boolean;
  loadingActivities?: boolean;
  activityName: string;
  selectedActivityId?: number;
  activityOptions: Array<{ value: string; label: string; id: number }>;
  onActivityNameChange: (v: string) => void;
  onSelectActivity: (v: string) => void;
  previewStats: ApplyScorePreviewStats | null;
  issueRows: ApplyScoreIssueRow[];
  onFileSelected: (file: File) => void | Promise<unknown>;
  onConfirmImport: () => void | Promise<unknown>;
};

const TEMPLATE_URL = "/templates/activity-apply-score-template.xlsx";

export default function ImportApplyScoreModal(props: Props) {
  const {
    open,
    onClose,
    parsing,
    submitting,
    loadingActivities,
    activityName,
    selectedActivityId,
    activityOptions,
    onActivityNameChange,
    onSelectActivity,
    previewStats,
    issueRows,
    onFileSelected,
    onConfirmImport,
  } = props;

  const stats = useMemo(
    () => ({
      total: previewStats?.total ?? 0,
      validCount: previewStats?.validCount ?? 0,
      submitCount: previewStats?.submitCount ?? 0,
      invalidCount: previewStats?.invalidCount ?? 0,
      duplicateCount: previewStats?.duplicateCount ?? 0,
      emptyCount: previewStats?.emptyCount ?? 0,
      invalidUsernameCount: previewStats?.invalidUsernameCount ?? 0,
      invalidScoreCount: previewStats?.invalidScoreCount ?? 0,
    }),
    [previewStats],
  );

  const uploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: ".xls,.xlsx",
    beforeUpload: async (file) => {
      await onFileSelected(file as File);
      return false;
    },
    showUploadList: true,
  };

  const hasParsedRows = stats.total > 0;
  const disabled = !!parsing || !!submitting;

  return (
    <Modal
      title="批量导入活动报名加分"
      open={open}
      onCancel={onClose}
      okText="确认导入"
      cancelText="取消"
      onOk={() => void onConfirmImport()}
      okButtonProps={{ disabled: !hasParsedRows || !!parsing }}
      confirmLoading={!!submitting}
      destroyOnClose
      maskClosable={false}
      width={760}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message={
            <Space direction="vertical" size={4}>
              <Text>请上传 xls/xlsx 文件，模板表头固定：username / score</Text>
              <Text type="secondary">
                仅校验：学号是否为空、分数是否为空、学号是否11位数字、分数是否为数字
              </Text>
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
                  <Link href={TEMPLATE_URL} target="_blank" rel="noreferrer">
                    {TEMPLATE_URL}
                  </Link>
                </Text>
              </Space>
            </Space>
          }
        />

        <AutoComplete
          options={activityOptions}
          value={activityName}
          onChange={onActivityNameChange}
          onSelect={onSelectActivity}
          placeholder="请输入活动名称并从下拉选择"
          notFoundContent={loadingActivities ? "活动加载中..." : "未匹配到活动"}
          disabled={disabled}
          style={{ width: "100%" }}
          popupMatchSelectWidth
          filterOption={(inputValue, option) =>
            String(option?.value ?? "")
              .toLowerCase()
              .includes(inputValue.toLowerCase())
          }
        />
        <Text type={selectedActivityId ? "secondary" : "warning"}>
          {selectedActivityId
            ? `已自动回填活动ID：${selectedActivityId}`
            : "请选择活动后自动回填 activityId"}
        </Text>

        <Upload.Dragger {...uploadProps} disabled={disabled}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">仅解析第一张表（第一个 sheet）</p>
        </Upload.Dragger>

        <Card size="small" title="解析统计">
          <Descriptions
            size="small"
            column={2}
            items={[
              { key: "total", label: "总行数", children: <Text strong>{stats.total}</Text> },
              { key: "valid", label: "校验通过", children: <Text strong>{stats.validCount}</Text> },
              { key: "submit", label: "可提交（已跳过重复）", children: <Text strong>{stats.submitCount}</Text> },
              { key: "invalid", label: "问题行数", children: <Text strong>{stats.invalidCount}</Text> },
              { key: "empty", label: "空值问题", children: <Text>{stats.emptyCount}</Text> },
              { key: "dup", label: "重复学号", children: <Text>{stats.duplicateCount}</Text> },
              { key: "username", label: "学号格式问题", children: <Text>{stats.invalidUsernameCount}</Text> },
              { key: "score", label: "分数格式问题", children: <Text>{stats.invalidScoreCount}</Text> },
            ]}
          />
          {hasParsedRows ? (
            <Alert
              style={{ marginTop: 12 }}
              type={stats.invalidCount > 0 ? "warning" : "success"}
              showIcon
              message={
                stats.invalidCount > 0
                  ? "已发现问题行，提交时将仅提交通过校验且非重复学号的数据"
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

        {issueRows.length > 0 && (
          <Card size="small" title={`问题明细（最多展示20条，当前${issueRows.length}条）`}>
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              {issueRows.map((row) => (
                <Text key={`${row.rowNo}-${row.username}-${row.scoreRaw}`} type="warning">
                  第{row.rowNo}行 / username={row.username || "-"} / score={row.scoreRaw || "-"}
                  ：{row.errors.join("；")}
                </Text>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
}
