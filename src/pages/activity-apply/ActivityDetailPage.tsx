// src/pages/activity-apply/ActivityDetailPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  Divider,
  Modal,
} from "antd";

import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

import "../../app/styles/activity-apply.css";

import {
  getMyApplications,
  searchActivityById,
} from "../../features/activity-apply/api";

import type {
  ActivityDetail,
  MyApplicationItem,
} from "../../features/activity-apply/types";

import {
  deriveApplyActionState,
  getPrimaryActionMeta,
  getApplyStateTagMeta,
  inSignWindow,
  getSignWindowReason,
} from "../../features/activity-apply/table/helpers";

import { useApplyActions } from "../../features/activity-apply/hooks/useApplyActions";
import { useApplyFlow } from "../../features/activity-apply/hooks/useApplyFlow";

import ApplyResultModal from "./ApplyResultModal";

const { Title, Text, Paragraph } = Typography;

/* 类型Tag */
function renderTypeTag(type: 0 | 1) {
  return type === 0 ? (
    <Tag color="blue">活动</Tag>
  ) : (
    <Tag color="purple">讲座</Tag>
  );
}

/* 状态Tag */
function renderStateTag(state: number) {
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

export default function ActivityDetailPage() {
  const nav = useNavigate();
  const params = useParams<{ id: string }>();

  const activityId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [myApps, setMyApps] = useState<MyApplicationItem[]>([]);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!Number.isFinite(activityId)) return;

    setLoading(true);
    setError(null);

    try {
      const [d, apps] = await Promise.all([
        searchActivityById({ id: activityId }),
        getMyApplications(),
      ]);

      setDetail(d.activity);
      setMyApps(apps ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const myApp = useMemo(
    () => myApps.find((a) => a.activityId === activityId),
    [myApps, activityId],
  );

  const applyState = deriveApplyActionState(myApp);
  const applyTag = getApplyStateTagMeta(applyState);
  const primary = getPrimaryActionMeta(applyState);

  const applyActions = useApplyActions({
    onChanged: reload,
    muteActionErrorToast: true,
  });

  const applyFlow = useApplyFlow({
    applyActions,
    onNotify: ({ kind, msg }) => {
      if (kind === "success") message.success(msg);
      else if (kind === "info") message.info(msg);
      else message.error(msg);
    },
    enableCandidateInFailModal: true,
    muteActionErrorToast: true,
  });

  const headerSubtitle = detail
    ? `${detail.type === 0 ? "活动" : "讲座"}：${detail.name}`
    : "加载中...";

  // ✅ 详情页按钮：报名/取消 都受“报名时间窗”控制（窗外禁用）
  const nowMs = Date.now();
  const signOk = detail ? inSignWindow(detail, nowMs) : false;
  const disabledReason = detail ? getSignWindowReason(detail, nowMs) : "加载中";
  const primaryDisabled = !detail || !signOk;

  const handlePrimaryClick = useCallback(async () => {
    if (!detail) return;
    if (!signOk) return;

    // primary.isCancel=true -> 走取消（并给 toast）；否则走报名（弹窗）
    if (primary.isCancel) {
      Modal.confirm({
        title: "确认取消？",
        content: `活动：${detail.name}`,
        okText: "确认",
        cancelText: "取消",
        onOk: async () => {
          await applyFlow.startCancelWithNotify(detail.id);
        },
      });
      return;
    }

    await applyFlow.startRegister({ id: detail.id, name: detail.name });
  }, [applyFlow, detail, primary.isCancel, signOk]);

  return (
    <div className="activity-apply-page">
      <div className="activity-apply-container">
        <div
          style={{
            height: "calc(113vh - 56px - 48px - 24px - 120px)",
            overflow: "auto",
          }}
        >
          <Card>
            {/* Header */}
            <div className="activity-apply-header">
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  活动 / 讲座详情
                </Title>

                <Text type="secondary">{headerSubtitle}</Text>
              </div>

              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
                  返回
                </Button>

                <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
                  刷新
                </Button>

                <Button
                  type="primary"
                  disabled={primaryDisabled}
                  title={primaryDisabled ? disabledReason : undefined}
                  loading={
                    detail ? applyActions.rowAction.isLoading(detail.id) : false
                  }
                  onClick={() => void handlePrimaryClick()}
                >
                  {primary.text}
                </Button>
              </Space>
            </div>

            <Divider />

            <Spin spinning={loading}>
              {!Number.isFinite(activityId) ? (
                <Text type="danger">参数错误：活动 ID 非法</Text>
              ) : null}

              {error ? <Text type="danger">加载失败</Text> : null}

              {detail ? (
                <>
                  {/* 基本信息 */}
                  <div className="activity-apply-section">
                    <div className="activity-apply-section-title">基本信息</div>

                    <div className="activity-apply-panel">
                      <Descriptions
                        bordered
                        column={2}
                        items={[
                          { label: "名称", children: detail.name },
                          {
                            label: "类型",
                            children: renderTypeTag(detail.type),
                          },
                          {
                            label: "活动状态",
                            children: renderStateTag(detail.state),
                          },
                          {
                            label: "我的报名状态",
                            children: (
                              <Tag color={applyTag.color}>{applyTag.label}</Tag>
                            ),
                          },
                          { label: "地点", children: detail.location },
                          {
                            label: "分数",
                            children: <Tag color="gold">{detail.score}</Tag>,
                          },
                          { label: "人数上限", children: detail.fullNum },

                          {
                            label: "成功申请",
                            children:
                              (detail.registeredNum ?? 0) +
                              (detail.candidateSuccNum ?? 0),
                          },

                          { label: "报名开始", children: detail.signStartTime },
                          { label: "报名结束", children: detail.signEndTime },
                          { label: "活动开始", children: detail.activityStime },
                          { label: "活动结束", children: detail.activityEtime },
                        ]}
                      />
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="activity-apply-section">
                    <div className="activity-apply-section-title">描述</div>

                    <div className="activity-apply-desc">
                      <Paragraph className="activity-apply-desc-content">
                        {detail.description || "-"}
                      </Paragraph>
                    </div>
                  </div>
                </>
              ) : null}
            </Spin>
          </Card>
        </div>

        {/* ✅ 报名结果弹窗：严格跟随 applyFlow.modal.kind */}
        <ApplyResultModal
          open={applyFlow.modal.open}
          kind={
            applyFlow.modal.kind === "REGISTER_OK"
              ? "REGISTER_SUCCESS"
              : "REGISTER_FAIL"
          }
          message={applyFlow.modal.msg}
          onClose={applyFlow.closeModal}
          onCandidate={
            applyFlow.modal.canCandidate
              ? async () => {
                  await applyFlow.startCandidateFromFailModal();
                }
              : undefined
          }
          candidating={applyFlow.modal.candidateLoading}
        />
      </div>
    </div>
  );
}
