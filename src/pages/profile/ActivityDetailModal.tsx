// src/pages/profile/ActivityDetailModal.tsx
import { MyActivityItem } from "../../features/profile/types"; // 导入 MyActivityItem 类型
import React from "react";
import {
  Modal,
  Spin,
  Empty,
  Divider,
  Space,
  Typography,
  Descriptions,
} from "antd";
import { ActivityDetail } from "../../features/profile/types";
import { ACTIVITY_STATE_LABEL } from "../../features/profile/types";
import {
  activityTypeLabel,
  applicationStateLabel,
  boolLabel,
} from "../../features/profile/table/helpers";

const { Text } = Typography;

function renderActivityDetail(detail: ActivityDetail) {
  return (
    <Descriptions
      size="small"
      column={2}
      labelStyle={{ width: 108 }}
      items={[
        { key: "name", label: "名称", children: detail.name },
        {
          key: "type",
          label: "类型",
          children: activityTypeLabel(detail.type),
        },
        {
          key: "state",
          label: "状态",
          children: ACTIVITY_STATE_LABEL[detail.state] ?? "-",
        },
        { key: "department", label: "部门", children: detail.department },
        { key: "location", label: "地点", children: detail.location },
        { key: "score", label: "分数", children: detail.score },
        { key: "fullNum", label: "容量", children: detail.fullNum },
        {
          key: "registeredNum",
          label: "已报名",
          children: detail.registeredNum,
        },
        { key: "candidateNum", label: "候补中", children: detail.candidateNum },
        {
          key: "candidateSuccNum",
          label: "候补成功",
          children: detail.candidateSuccNum,
        },
        {
          key: "candidateFailNum",
          label: "候补失败",
          children: detail.candidateFailNum,
        },
        { key: "time", label: "创建时间", children: detail.time },
        {
          key: "signStartTime",
          label: "报名开始",
          children: detail.signStartTime,
        },
        { key: "signEndTime", label: "报名截止", children: detail.signEndTime },
        {
          key: "activityStime",
          label: "开始时间",
          children: detail.activityStime,
        },
        {
          key: "activityEtime",
          label: "结束时间",
          children: detail.activityEtime,
        },
        {
          key: "description",
          label: "描述",
          children: (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {detail.description || "-"}
            </div>
          ),
        },
      ]}
    />
  );
}

interface ActivityDetailModalProps {
  open: boolean;
  loading: boolean;
  detail: ActivityDetail | null;
  currentRow: MyActivityItem | null; // 使用 MyActivityItem 类型
  onCancel: () => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  open,
  loading,
  detail,
  currentRow,
  onCancel,
}) => {
  return (
    <Modal
      title="活动详情"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : !detail ? (
        <Empty description="未找到活动详情" />
      ) : (
        <div>
          {renderActivityDetail(detail)}
          <Divider />
          <Space wrap>
            <Text type="secondary">（报名记录字段）</Text>
            <Text type="secondary">
              报名状态：{applicationStateLabel(currentRow?.state)}
            </Text>
            <Text type="secondary">签到：{boolLabel(currentRow?.checkIn)}</Text>
            <Text type="secondary">
              签退：{boolLabel(currentRow?.checkOut)}
            </Text>
            <Text type="secondary">
              可加分：{boolLabel(currentRow?.getScore)}
            </Text>
          </Space>
        </div>
      )}
    </Modal>
  );
};

export default ActivityDetailModal;
