// src/pages/rbac/user/ImportResultModal.tsx

/**
 * ImportResultModal
 *
 * ✅ 页面层 UI 组件
 * - 只负责展示“批量导入结果”
 * - 不请求、不解析（结果数据由 useUserImportFlow / 页面层传入）
 *
 * 展示内容：
 * - 成功 X / 失败 Y
 * - 若有 failedDetails：展示失败明细表格
 * - 若有 failedUsernames：展示用户名列表（折叠）
 * - 若有 failedFileUrl：提供“下载失败名单”按钮（由父层决定如何处理）
 */

import React, { useMemo } from "react";
import { Modal, Typography, Space, Alert, Table, Button, Collapse } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { BatchInsertUserResult } from "../../../features/rbac/user/types";

const { Text } = Typography;

export type ImportResultModalProps = {
  open: boolean;
  onClose: () => void;

  /** 导入结果（后端返回） */
  result?: BatchInsertUserResult | null;

  /** 点击下载失败名单（可选） */
  onDownloadFailed?: (url: string) => void;
};

type FailedRow = { username: string; reason: string };

export default function ImportResultModal(props: ImportResultModalProps) {
  const { open, onClose, result, onDownloadFailed } = props;

  const successCount = result?.successCount ?? 0;
  const failCount = result?.failCount ?? 0;

  const failedDetails: FailedRow[] = useMemo(() => {
    return (result?.failedDetails ?? []).map((x) => ({
      username: x.username,
      reason: x.reason,
    }));
  }, [result?.failedDetails]);

  const failedUsernames = result?.failedUsernames ?? [];
  const failedFileUrl = result?.failedFileUrl;

  const columns: ColumnsType<FailedRow> = useMemo(
    () => [
      { title: "学号", dataIndex: "username", key: "username", width: 160 },
      { title: "失败原因", dataIndex: "reason", key: "reason" },
    ],
    [],
  );

  const summaryType = failCount > 0 ? "warning" : "success";

  return (
    <Modal
      title="导入结果"
      open={open}
      onCancel={onClose}
      okText="我已确认"
      onOk={onClose}
      destroyOnClose
      maskClosable={false}
      width={720}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          showIcon
          type={summaryType}
          message={
            <Space size={12}>
              <Text>
                成功导入：<strong>{successCount}</strong>
              </Text>
              <Text>
                失败：<strong>{failCount}</strong>
              </Text>
            </Space>
          }
        />

        {!!failedFileUrl && (
          <Button
            onClick={() => onDownloadFailed?.(failedFileUrl)}
            disabled={!onDownloadFailed}
          >
            下载失败名单
          </Button>
        )}

        {failedDetails.length > 0 && (
          <>
            <Text strong>失败明细</Text>
            <Table
              size="small"
              rowKey={(r) => `${r.username}-${r.reason}`}
              columns={columns}
              dataSource={failedDetails}
              pagination={{ pageSize: 8 }}
            />
          </>
        )}

        {failedUsernames.length > 0 && (
          <Collapse
            items={[
              {
                key: "failed-users",
                label: `失败学号列表（${failedUsernames.length}）`,
                children: (
                  <div style={{ maxHeight: 160, overflow: "auto" }}>
                    <Space wrap>
                      {failedUsernames.map((u) => (
                        <Text code key={u}>
                          {u}
                        </Text>
                      ))}
                    </Space>
                  </div>
                ),
              },
            ]}
          />
        )}

        {failCount === 0 && (
          <Text type="secondary">提示：列表会在关闭后自动刷新。</Text>
        )}
      </Space>
    </Modal>
  );
}
