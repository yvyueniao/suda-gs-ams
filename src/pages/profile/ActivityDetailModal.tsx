// src/pages/profile/ActivityDetailModal.tsx
/**
 * ActivityDetailModal
 *
 * ✅ 文件定位
 * - 个人中心页「我的活动/讲座」中的【详情】弹窗
 * - 纯展示组件（UI 层），不负责：
 *   - 请求数据（由 useProfileMyActivitiesTable 处理）
 *   - message 提示
 *   - 业务状态管理
 *
 * ✅ 数据来源
 * - detail：活动详情（来自 getActivityDetail 接口）
 * - currentRow：当前“我的报名记录”行数据（来自表格）
 *
 * ✅ 设计原则
 * - detail 控制“活动本体信息”
 * - currentRow 控制“我的报名状态相关字段”
 * - 两者解耦，任何一个缺失都不报错
 * - destroyOnClose：关闭即销毁，避免残留状态
 */

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

import type {
  ActivityDetail,
  MyActivityItem,
} from "../../features/profile/types";

import { ACTIVITY_STATE_LABEL } from "../../features/profile/types";
import {
  activityTypeLabel,
  applicationStateLabel,
  boolLabel,
} from "../../features/profile/table/helpers";

const { Text } = Typography;

/**
 * 渲染活动本体详情
 */
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
        {
          key: "signEndTime",
          label: "报名截止",
          children: detail.signEndTime,
        },
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

export interface ActivityDetailModalProps {
  open: boolean;
  loading: boolean;
  detail: ActivityDetail | null;
  currentRow: MyActivityItem | null;
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
      width={880}
    >
      {loading ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Spin />
        </div>
      ) : !detail ? (
        <Empty description="未找到活动详情" />
      ) : (
        <>
          {renderActivityDetail(detail)}

          <Divider />

          <Space wrap>
            <Text type="secondary">（我的报名记录）</Text>

            <Text type="secondary">
              报名状态：
              {currentRow ? applicationStateLabel(currentRow.state) : "-"}
            </Text>

            <Text type="secondary">
              签到：
              {currentRow ? boolLabel(currentRow.checkIn) : "-"}
            </Text>

            <Text type="secondary">
              签退：
              {currentRow ? boolLabel(currentRow.checkOut) : "-"}
            </Text>

            <Text type="secondary">
              可加分：
              {currentRow ? boolLabel(currentRow.getScore) : "-"}
            </Text>
          </Space>
        </>
      )}
    </Modal>
  );
};

export default ActivityDetailModal;
