// src/pages/rbac/user/ImportResultModal.tsx

/**
 * ImportResultModal
 *
 * ✅ 页面层 UI 组件
 * - 只负责展示“批量导入结果”
 * - 结果展示完全基于后端返回：code / msg / data
 * - 不假设 successCount/failCount 等结构化字段（避免不配套）
 */

import { useMemo } from "react";
import { Modal, Typography, Space, Alert, Button } from "antd";

const { Text } = Typography;

export type ImportResultModalProps = {
  open: boolean;
  onClose: () => void;

  /**
   * ✅ 后端统一返回壳（按你接口文档）
   * 示例：
   * { code: 200, msg: "操作成功", data: "成功添加2条数据", timestamp: 1770010244887 }
   */
  result?: {
    code?: number;
    msg?: string;
    data?: unknown;
    timestamp?: number;
  } | null;

  /** 可选：如果后端某天给了失败文件 url（比如 data 里包含 url），你可以在父层传进来 */
  onDownloadFailed?: (url: string) => void;
};

function toText(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

/**
 * 从 data 里“尽量”解析出下载链接（可选能力）
 * - 如果你后端现在 data 是字符串，就不会解析出 url
 * - 如果未来 data 变成 { failedFileUrl: "xxx" } 也能兼容
 */
function pickFailedUrl(data: unknown): string | undefined {
  if (!data) return undefined;

  if (typeof data === "object") {
    const anyData = data as any;
    const url =
      anyData.failedFileUrl ??
      anyData.fileUrl ??
      anyData.url ??
      anyData.downloadUrl;
    return typeof url === "string" && url.trim() ? url.trim() : undefined;
  }

  // data 是字符串：一般是“成功添加X条数据”，不包含 url
  return undefined;
}

export default function ImportResultModal(props: ImportResultModalProps) {
  const { open, onClose, result, onDownloadFailed } = props;

  const code = result?.code;
  const msg = (result?.msg ?? "").trim();
  const dataText = useMemo(() => toText(result?.data).trim(), [result?.data]);

  const ok = code === 200;
  const alertType = ok ? "success" : "error";

  const titleText = ok ? "导入成功" : "导入失败";

  const failedUrl = useMemo(() => pickFailedUrl(result?.data), [result?.data]);

  return (
    <Modal
      title="导入结果"
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="我已确认"
      destroyOnClose
      maskClosable={false}
      width={640}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          showIcon
          type={alertType}
          message={<Text strong>{titleText}</Text>}
          description={
            <Space direction="vertical" size={6}>
              {msg ? <Text>{msg}</Text> : null}
              {dataText ? (
                <Text type="secondary" style={{ whiteSpace: "pre-wrap" }}>
                  {dataText}
                </Text>
              ) : null}

              {!msg && !dataText ? (
                <Text type="secondary">未返回可展示的信息</Text>
              ) : null}
            </Space>
          }
        />

        {failedUrl && (
          <Button
            onClick={() => onDownloadFailed?.(failedUrl)}
            disabled={!onDownloadFailed}
          >
            下载失败名单
          </Button>
        )}
      </Space>
    </Modal>
  );
}
