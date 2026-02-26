// src/pages/rbac/user/ExportByTimeModal.tsx

import { useMemo } from "react";
import { Modal, Space, Typography, DatePicker, Alert } from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export type ExportByTimeModalProps = {
  open: boolean;
  onClose: () => void;

  /** 导出中 */
  loading?: boolean;

  /** 时间段（字符串） */
  value: {
    startTime: string;
    endTime: string;
  };

  /** 直接设置时间段（父层维护格式化） */
  onChangeRange: (startTime: string, endTime: string) => void;

  /** 点击确认导出 */
  onConfirm: () => void | Promise<unknown>;
};

/** 把 "YYYY-MM-DD" 解析成 dayjs */
function parseToDayjs(v: string): Dayjs | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = dayjs(s, "YYYY-MM-DD", true);
  return d.isValid() ? d : null;
}

/** 输出为 "YYYY-MM-DD" */
function formatDayjs(d: Dayjs): string {
  return d.format("YYYY-MM-DD");
}

export default function ExportByTimeModal(props: ExportByTimeModalProps) {
  const { open, onClose, loading, value, onChangeRange, onConfirm } = props;

  const start = useMemo(() => parseToDayjs(value.startTime), [value.startTime]);
  const end = useMemo(() => parseToDayjs(value.endTime), [value.endTime]);

  const canConfirm = !!value.startTime && !!value.endTime;
  const disabled = !!loading;

  return (
    <Modal
      title="按时间段导出"
      open={open}
      onCancel={onClose}
      okText="确认导出"
      cancelText="取消"
      confirmLoading={!!loading}
      okButtonProps={{ disabled: !canConfirm }}
      maskClosable={false}
      destroyOnClose
      width={720}
      onOk={() => void onConfirm()}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="请选择要导出的日期区间，系统将导出该时间段内用户的社会服务分与讲座次数。"
          description="所选时间段须覆盖活动时间，从报名开始直到活动结束。"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Text strong>日期区间</Text>

          <RangePicker
            style={{ width: "100%" }}
            value={start && end ? ([start, end] as any) : (null as any)}
            onChange={(vals) => {
              if (disabled) return;

              const v0 = vals?.[0] ?? null;
              const v1 = vals?.[1] ?? null;

              if (!v0 || !v1) {
                onChangeRange("", "");
                return;
              }

              onChangeRange(formatDayjs(v0 as Dayjs), formatDayjs(v1 as Dayjs));
            }}
            placeholder={["开始日期", "结束日期"]}
            disabled={disabled}
            allowClear
          />

          <Text type="secondary">
            当前：{value.startTime ? value.startTime : "未选择"} ～{" "}
            {value.endTime ? value.endTime : "未选择"}
          </Text>
        </div>
      </Space>
    </Modal>
  );
}
