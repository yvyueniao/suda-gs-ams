// src/pages/activity-admin/ActivityAdminDetailPage.tsx

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { request } from "../../shared/http/client";

import ActivityUpsertModal from "./ActivityUpsertModal";
import { updateActivityInfo } from "../../features/activity-admin/api";

import RegisterListPanel from "./applications/RegisterListPanel";
import CandidateListPanel from "./applications/CandidateListPanel";
import SupplementListPanel from "./applications/SupplementListPanel";

import type {
  ActivityState,
  ActivityType,
  UpdateActivityPayload,
} from "../../features/activity-admin/types";

import "../../app/styles/activity-admin.css";

const { Title, Text, Paragraph } = Typography;

type ActivityDetail = {
  id: number;
  name: string;
  description: string;
  department: string;
  time: string;
  signStartTime: string;
  signEndTime: string;
  fullNum: number;
  score: number;
  location: string;
  activityStime: string;
  activityEtime: string;
  type: ActivityType;
  state: ActivityState;
  registeredNum: number;
  candidateNum: number;
  candidateSuccNum: number;
  candidateFailNum: number;
};

type SearchByIdResponse = {
  activity: ActivityDetail;
};

function typeText(type: ActivityType) {
  return type === 0 ? "活动" : "讲座";
}

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "registers" | "candidates" | "supplements"
  >("registers");

  const fetchDetail = useCallback(async () => {
    if (!Number.isFinite(activityId) || activityId <= 0) {
      setError(new Error("非法活动 ID"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const resp = await request<SearchByIdResponse>({
        url: "/activity/searchById",
        method: "POST",
        data: { id: activityId },
      });

      setDetail(resp.activity);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const back = () => navigate(-1);

  // ✅ Header 副标题：用“类型：名称”，替代“ID：2”
  const headerSubtitle = useMemo(() => {
    if (detail) return `${typeText(detail.type)}：${detail.name}`;
    return "详情加载中…";
  }, [detail]);

  return (
    <div className="activity-admin-page">
      <div className="activity-admin-container">
        <Card>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {/* Header */}
            <div className="activity-admin-detail-header">
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  活动 / 讲座详情
                </Title>

                <Text type="secondary">{headerSubtitle}</Text>
              </div>

              <Space>
                <Button onClick={back}>返回</Button>

                <Can roles={[0, 1, 2, 3]}>
                  <Button
                    type="primary"
                    onClick={() => setModalOpen(true)}
                    disabled={!detail}
                  >
                    修改
                  </Button>
                </Can>
              </Space>
            </div>

            <Divider />

            {loading ? (
              <Spin />
            ) : error ? (
              <Empty
                description={
                  error instanceof ApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "加载失败"
                }
              />
            ) : !detail ? (
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
                        { key: "name", label: "名称", children: detail.name },
                        {
                          key: "type",
                          label: "类型",
                          children: renderTypeTag(detail.type),
                        },
                        {
                          key: "state",
                          label: "状态",
                          children: renderStateTag(detail.state),
                        },
                        {
                          key: "department",
                          label: "部门",
                          children: detail.department,
                        },
                        {
                          key: "location",
                          label: "地点",
                          children: detail.location,
                        },
                        {
                          key: "score",
                          label: "分数",
                          children: <Tag color="gold">{detail.score}</Tag>,
                        },
                        {
                          key: "fullNum",
                          label: "人数上限",
                          children: detail.fullNum,
                        },
                        {
                          key: "registeredNum",
                          label: "已报名",
                          children: detail.registeredNum,
                        },
                        {
                          key: "candidateNum",
                          label: "候补人数",
                          children: detail.candidateNum,
                        },
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
                        {
                          key: "time",
                          label: "创建时间",
                          children: detail.time,
                        },
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
                          label: "活动开始",
                          children: detail.activityStime,
                        },
                        {
                          key: "activityEtime",
                          label: "活动结束",
                          children: detail.activityEtime,
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
                      {detail.description || <Text type="secondary">-</Text>}
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
                            <RegisterListPanel activityId={detail.id} />
                          ),
                        },
                        {
                          key: "candidates",
                          label: "候补人员列表",
                          children: (
                            <CandidateListPanel activityId={detail.id} />
                          ),
                        },
                        {
                          key: "supplements",
                          label: "补报名人员列表",
                          children: (
                            <SupplementListPanel activityId={detail.id} />
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
            open={modalOpen}
            mode="edit"
            editing={detail}
            onCancel={() => setModalOpen(false)}
            onSubmitCreate={async () => {}}
            onSubmitUpdate={async (payload: UpdateActivityPayload) => {
              await updateActivityInfo(payload);
            }}
            onSuccess={async () => {
              setModalOpen(false);
              await fetchDetail();
            }}
          />
        </Card>
      </div>
    </div>
  );
}
