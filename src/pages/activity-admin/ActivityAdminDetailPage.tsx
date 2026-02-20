// src/pages/activity-admin/ActivityAdminDetailPage.tsx

/**
 * ActivityAdminDetailPage
 *
 * 职责：
 * - 活动/讲座管理端详情页（隐藏路由）
 * - 展示：活动/讲座完整信息（包含 description）
 * - 提供：返回列表、修改入口（复用 UpsertModal 的 edit 模式）
 * - ✅ 新增：详情页下方三列表（Tab 切换）
 *   - 报名人员列表 / 候补人员列表 / 补报名人员列表
 */

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

function typeLabel(type: ActivityType) {
  return type === 0 ? "活动" : "讲座";
}

function stateLabel(state: ActivityState) {
  const map: Record<ActivityState, string> = {
    0: "未开始",
    1: "报名中",
    2: "报名结束",
    3: "进行中",
    4: "已结束",
  };
  return map[state] ?? "-";
}

export default function ActivityAdminDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const activityId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);

  // ✅ 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ 三列表 Tab
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

  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            活动 / 讲座详情
          </Title>

          <Space>
            <Button onClick={back}>返回</Button>

            {/* ✅ 修改按钮：打开弹窗 */}
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
        </Space>

        <Divider style={{ margin: "8px 0" }} />

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
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                { key: "id", label: "ID", children: detail.id },
                { key: "name", label: "名称", children: detail.name },
                {
                  key: "type",
                  label: "类型",
                  children: typeLabel(detail.type),
                },
                {
                  key: "state",
                  label: "状态",
                  children: stateLabel(detail.state),
                },
                {
                  key: "department",
                  label: "部门",
                  children: detail.department,
                },
                { key: "location", label: "地点", children: detail.location },
                { key: "score", label: "分数", children: detail.score },
                { key: "fullNum", label: "人数上限", children: detail.fullNum },
                {
                  key: "registeredNum",
                  label: "已报名人数",
                  children: detail.registeredNum,
                },
                {
                  key: "candidateNum",
                  label: "候补人数",
                  children: detail.candidateNum,
                },
                {
                  key: "candidateSuccNum",
                  label: "候补成功人数",
                  children: detail.candidateSuccNum,
                },
                {
                  key: "candidateFailNum",
                  label: "候补失败人数",
                  children: detail.candidateFailNum,
                },
                { key: "time", label: "创建时间", children: detail.time },
                {
                  key: "signStartTime",
                  label: "报名开始时间",
                  children: detail.signStartTime,
                },
                {
                  key: "signEndTime",
                  label: "报名截止时间",
                  children: detail.signEndTime,
                },
                {
                  key: "activityStime",
                  label: "活动开始时间",
                  children: detail.activityStime,
                },
                {
                  key: "activityEtime",
                  label: "活动结束时间",
                  children: detail.activityEtime,
                },
              ]}
            />

            <Divider style={{ margin: "12px 0" }} />

            <Title level={5}>描述</Title>
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>
              {detail.description || <Text type="secondary">-</Text>}
            </Paragraph>

            <Divider style={{ margin: "12px 0" }} />

            {/* ✅ 三列表（Tab 切换） */}
            <Tabs
              activeKey={activeTab}
              onChange={(k) =>
                setActiveTab(k as "registers" | "candidates" | "supplements")
              }
              items={[
                {
                  key: "registers",
                  label: "报名人员列表",
                  children: <RegisterListPanel activityId={detail.id} />,
                },
                {
                  key: "candidates",
                  label: "候补人员列表",
                  children: <CandidateListPanel activityId={detail.id} />,
                },
                {
                  key: "supplements",
                  label: "补报名人员列表",
                  children: <SupplementListPanel activityId={detail.id} />,
                },
              ]}
            />
          </>
        )}
      </Space>

      {/* ✅ 复用 UpsertModal（edit 模式） */}
      <ActivityUpsertModal
        open={modalOpen}
        mode="edit"
        editing={detail}
        onCancel={() => setModalOpen(false)}
        // ✅ 兜底：edit 模式不会走 create，但 props 必填
        onSubmitCreate={async () => {
          // 理论上不会触发；写成 no-op，避免类型报错
          return;
        }}
        onSubmitUpdate={async (payload: UpdateActivityPayload) => {
          await updateActivityInfo(payload);
        }}
        onSuccess={async () => {
          setModalOpen(false);
          await fetchDetail(); // ✅ 修改成功后刷新详情
        }}
      />
    </Card>
  );
}
