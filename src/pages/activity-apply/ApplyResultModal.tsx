// src/pages/activity-apply/ApplyResultModal.tsx

import { useMemo } from "react";
import { Button, Modal, Space, Typography } from "antd";

const { Text } = Typography;

export type ApplyResultKind = "REGISTER_SUCCESS" | "REGISTER_FAIL";

export type ApplyResultModalProps = {
  open: boolean;

  /** 成功/失败 */
  kind: ApplyResultKind;

  /** 主文案（成功可不传；失败建议传后端 msg） */
  message?: string;

  /** 关闭弹窗 */
  onClose: () => void;

  /**
   * ✅ 仅失败弹窗需要：候补按钮
   * - 点击后：由页面层执行候补（成功/失败 toast），并关闭弹窗
   */
  onCandidate?: () => void | Promise<unknown>;

  /** 候补按钮 loading（可选） */
  candidating?: boolean;

  /** 主按钮 loading（可选：比如你想把“知道了”也做成异步） */
  primaryLoading?: boolean;
};

function modalTitle(kind: ApplyResultKind) {
  return kind === "REGISTER_SUCCESS" ? "报名成功" : "报名失败";
}

export default function ApplyResultModal(props: ApplyResultModalProps) {
  const {
    open,
    kind,
    message,
    onClose,
    onCandidate,
    candidating,
    primaryLoading,
  } = props;

  const isFail = kind === "REGISTER_FAIL";

  const content = useMemo(() => {
    if (kind === "REGISTER_SUCCESS") {
      return (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text>你已成功报名该活动/讲座。</Text>
          <Text type="secondary">
            请按时参加并按要求完成签到/签退（如有）。
          </Text>
        </Space>
      );
    }

    return (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Text type="danger">{message || "报名失败，请稍后重试。"}</Text>
        {onCandidate ? (
          <Text type="secondary">
            你可以选择“候补”，系统会在有名额或满足条件时按规则处理。
          </Text>
        ) : null}
      </Space>
    );
  }, [kind, message, onCandidate]);

  return (
    <Modal
      open={open}
      title={modalTitle(kind)}
      onCancel={onClose}
      destroyOnClose
      maskClosable={false}
      footer={
        <Space>
          {isFail && onCandidate ? (
            <Button
              type="primary"
              onClick={() => void onCandidate()}
              loading={!!candidating}
            >
              候补
            </Button>
          ) : null}

          <Button onClick={onClose} loading={!!primaryLoading}>
            {kind === "REGISTER_SUCCESS" ? "知道了" : "关闭"}
          </Button>
        </Space>
      }
    >
      {content}
    </Modal>
  );
}
