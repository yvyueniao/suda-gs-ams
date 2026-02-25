// src/pages/activity-admin/ActivityAdminDetailPage.tsx

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Space,
  Spin,
  Typography,
  Tabs,
  Tag,
} from "antd";

import { Can } from "../../shared/components/guard/Can";
import { ApiError } from "../../shared/http/error";

import ActivityUpsertModal from "./ActivityUpsertModal";

import RegisterListPanel from "./applications/RegisterListPanel";
import CandidateListPanel from "./applications/CandidateListPanel";
import SupplementListPanel from "./applications/SupplementListPanel";

import type {
  ActivityState,
  ActivityType,
  UpdateActivityPayload,
} from "../../features/activity-admin/types";

import { useActivityAdminDetailPage } from "../../features/activity-admin/hooks/useActivityAdminDetailPage";

import "../../app/styles/activity-admin.css";

const { Title, Text, Paragraph } = Typography;

function renderTypeTag(type: ActivityType) {
  return type === 0 ? (
    <Tag color="blue">活动</Tag>
  ) : (
    <Tag color="purple">讲座</Tag>
  );
}

function renderStateTag(state: ActivityState) {
  switch (state) {
    case 0:
      return <Tag>未开始</Tag>;
    case 1:
      return <Tag color="green">报名中</Tag>;
    case 2:
      return <Tag color="orange">报名结束</Tag>;
    case 3:
      return <Tag color="processing">进行中</Tag>;
    case 4:
      return <Tag color="default">已结束</Tag>;
    default:
      return <Tag>-</Tag>;
  }
}

export default function ActivityAdminDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const activityId = useMemo(() => Number(id), [id]);

  // ✅ 业务编排下沉到 hook（不在页面里 request / update）
  const d = useActivityAdminDetailPage(activityId);

  // 仅 UI 态：当前激活 tab（保留你原来的交互）
  const [activeTab, setActiveTab] = useState<
    "registers" | "candidates" | "supplements"
  >("registers");

  const back = () => navigate(-1);

  return (
    <div className="activity-admin-page">
      <div className="activity-admin-container">
        <div
          style={{
            height: "calc(113vh - 56px - 48px - 24px - 120px)",
            overflow: "auto",
          }}
        >
          <Card>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {/* Header */}
              <div className="activity-admin-detail-header">
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    活动 / 讲座详情
                  </Title>

                  <Text type="secondary">{d.headerSubtitle}</Text>
                </div>

                <Space>
                  <Button onClick={back}>返回</Button>

                  <Can roles={[0, 1, 2, 3]}>
                    <Button
                      type="primary"
                      onClick={d.openEdit}
                      disabled={!d.detail}
                    >
                      修改
                    </Button>
                  </Can>
                </Space>
              </div>

              <Divider />

              {d.loading ? (
                <Spin />
              ) : d.error ? (
                <Empty
                  description={
                    d.error instanceof ApiError
                      ? d.error.message
                      : d.error instanceof Error
                        ? d.error.message
                        : "加载失败"
                  }
                />
              ) : !d.detail ? (
                <Empty description="暂无数据" />
              ) : (
                <>
                  {/* 基本信息 */}
                  <div className="activity-admin-section">
                    <div className="activity-admin-section-title">基本信息</div>

                    <div className="activity-admin-panel">
                      <Descriptions
                        bordered
                        size="small"
                        column={2}
                        items={[
                          {
                            key: "name",
                            label: "名称",
                            children: d.detail.name,
                          },
                          {
                            key: "type",
                            label: "类型",
                            children: renderTypeTag(d.detail.type),
                          },
                          {
                            key: "state",
                            label: "状态",
                            children: renderStateTag(d.detail.state),
                          },
                          {
                            key: "department",
                            label: "部门",
                            children: d.detail.department,
                          },
                          {
                            key: "location",
                            label: "地点",
                            children: d.detail.location,
                          },
                          {
                            key: "score",
                            label: "分数",
                            children: <Tag color="gold">{d.detail.score}</Tag>,
                          },
                          {
                            key: "fullNum",
                            label: "人数上限",
                            children: d.detail.fullNum,
                          },
                          {
                            key: "registeredNum",
                            label: "已报名",
                            children: d.detail.registeredNum,
                          },
                          {
                            key: "candidateNum",
                            label: "候补人数",
                            children: d.detail.candidateNum,
                          },
                          {
                            key: "candidateSuccNum",
                            label: "候补成功",
                            children: d.detail.candidateSuccNum,
                          },
                          {
                            key: "candidateFailNum",
                            label: "候补失败",
                            children: d.detail.candidateFailNum,
                          },
                          {
                            key: "time",
                            label: "创建时间",
                            children: d.detail.time,
                          },
                          {
                            key: "signStartTime",
                            label: "报名开始",
                            children: d.detail.signStartTime,
                          },
                          {
                            key: "signEndTime",
                            label: "报名截止",
                            children: d.detail.signEndTime,
                          },
                          {
                            key: "activityStime",
                            label: "活动开始",
                            children: d.detail.activityStime,
                          },
                          {
                            key: "activityEtime",
                            label: "活动结束",
                            children: d.detail.activityEtime,
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="activity-admin-section">
                    <div className="activity-admin-section-title">描述</div>

                    <div className="activity-admin-desc">
                      <Paragraph className="activity-admin-desc-content">
                        {d.detail.description || (
                          <Text type="secondary">-</Text>
                        )}
                      </Paragraph>
                    </div>
                  </div>

                  {/* 报名管理 */}
                  <div className="activity-admin-section">
                    <div className="activity-admin-section-title">报名管理</div>

                    <div className="activity-admin-panel">
                      <Tabs
                        activeKey={activeTab}
                        onChange={(k) =>
                          setActiveTab(
                            k as "registers" | "candidates" | "supplements",
                          )
                        }
                        items={[
                          {
                            key: "registers",
                            label: "报名人员列表",
                            children: (
                              <RegisterListPanel activityId={d.detail.id} />
                            ),
                          },
                          {
                            key: "candidates",
                            label: "候补人员列表",
                            children: (
                              <CandidateListPanel activityId={d.detail.id} />
                            ),
                          },
                          {
                            key: "supplements",
                            label: "补报名人员列表",
                            children: (
                              <SupplementListPanel activityId={d.detail.id} />
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </>
              )}
            </Space>

            {/* UpsertModal（edit 模式） */}
            <ActivityUpsertModal
              open={d.modalOpen}
              mode="edit"
              editing={d.detail}
              onCancel={d.closeEdit}
              onSubmitCreate={async () => undefined}
              onSubmitUpdate={async (payload: UpdateActivityPayload) => {
                // ✅ 统一由 hook 编排（会自动 close + reload）
                return await d.submitUpdate(payload);
              }}
              onSuccess={async () => {
                // ✅ hook 内部已 close + reload，这里无需重复
                return;
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
