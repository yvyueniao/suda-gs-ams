// src/pages/activity-apply/ActivityDetailPage.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Modal,
} from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

import {
  getMyApplications,
  searchActivityById,
} from "../../features/activity-apply/api";
import type {
  ActivityDetailResponse,
  ActivityItem,
  ApplyActionState,
  MyApplicationItem,
} from "../../features/activity-apply/types";

import {
  deriveApplyActionState,
  inSignWindow,
  // ✅ 12h 取消限制已删除：这里不再 import canCancelBy12h
  getPrimaryActionMeta,
  getApplyStateTagMeta,
  getCancelConfirmMeta,
} from "../../features/activity-apply/table/helpers";

import { useApplyActions } from "../../features/activity-apply/hooks/useApplyActions";
import { useApplyFlow } from "../../features/activity-apply/hooks/useApplyFlow";

import ApplyResultModal from "./ApplyResultModal";

const { Title, Text } = Typography;

function activityTypeLabel(type: 0 | 1) {
  return type === 0 ? "活动" : "讲座";
}

function activityStateLabel(state: 0 | 1 | 2 | 3 | 4) {
  const map: Record<number, string> = {
    0: "未开始",
    1: "报名中",
    2: "报名结束",
    3: "进行中",
    4: "已结束",
  };
  return map[state] ?? "-";
}

export default function ActivityDetailPage() {
  const nav = useNavigate();
  const params = useParams<{ id: string }>();

  const activityId = useMemo(() => {
    const n = Number(params.id);
    return Number.isFinite(n) ? n : null;
  }, [params.id]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [detail, setDetail] = useState<
    ActivityDetailResponse["activity"] | null
  >(null);
  const [myApps, setMyApps] = useState<MyApplicationItem[]>([]);

  const reload = useCallback(async () => {
    if (activityId == null) return;

    setLoading(true);
    setError(null);

    try {
      const [d, apps] = await Promise.all([
        searchActivityById({ id: activityId }),
        getMyApplications(),
      ]);

      setDetail(d.activity ?? null);
      setMyApps(apps ?? []);
    } catch (e) {
      setError(e);
      setDetail(null);
      setMyApps([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const myApp = useMemo(() => {
    if (activityId == null) return undefined;
    return myApps.find((a) => a.activityId === activityId);
  }, [activityId, myApps]);

  const applyState: ApplyActionState = useMemo(() => {
    return deriveApplyActionState(myApp);
  }, [myApp]);

  /**
   * ✅ 动作：由 flow 统一 toast（报名弹窗 + 取消成功/失败提示）
   * - actions 只负责请求与 loading
   * - 页面层负责 message 渲染
   */
  const applyActions = useApplyActions({
    onChanged: async () => {
      await reload();
    },
    muteActionErrorToast: true,
  });

  const applyFlow = useApplyFlow({
    applyActions,
    // ✅ 不重复传 onChanged，避免一次动作触发两次 reload
    onNotify: ({ kind, msg }) => {
      if (kind === "success") message.success(msg);
      else if (kind === "error") message.error(msg);
      else message.info(msg);
    },
    enableCandidateInFailModal: true,
    muteActionErrorToast: true,
  });

  const primary = useMemo(() => getPrimaryActionMeta(applyState), [applyState]);
  const isCancel = primary.isCancel;

  /**
   * nowMs：用于“报名时间窗内才能取消”的前置禁用
   * - 你现在不用 12h 限制了，所以只需要这个判断
   * - 这里用 useMemo 让它在“详情/状态变化”时更新一次即可
   */
  const nowMs = useMemo(() => Date.now(), [detail?.id, applyState]);

  const signOk = useMemo(() => {
    if (!detail) return false;
    return inSignWindow(
      {
        signStartTime: detail.signStartTime,
        signEndTime: detail.signEndTime,
      } as Pick<ActivityItem, "signStartTime" | "signEndTime">,
      nowMs,
    );
  }, [detail, nowMs]);

  /**
   * ✅ 取消限制（已按你要求删除 12h 规则）：
   * - 报名：不前置禁用（交给后端 msg + 报名结果弹窗）
   * - 取消：只做“报名时间窗”限制
   */
  const primaryDisabled = useMemo(() => {
    if (!detail) return true;
    return isCancel ? !signOk : false;
  }, [detail, isCancel, signOk]);

  const primaryReason = useMemo(() => {
    if (!isCancel) return undefined;
    if (!signOk) return "不在报名时间范围内";
    return undefined;
  }, [isCancel, signOk]);

  const primaryLoading = useMemo(() => {
    if (activityId == null) return false;
    return applyActions.rowAction.isLoading(activityId);
  }, [activityId, applyActions]);

  const onPrimaryClick = useCallback(async () => {
    if (activityId == null || !detail) return;

    // ✅ 报名：走 flow（必弹成功/失败弹窗）
    if (!isCancel) {
      await applyFlow.startRegister({ id: activityId, name: detail.name });
      return;
    }

    // ✅ 取消：二次确认 + 最终成功/失败 toast（统一走 flow）
    const confirm = getCancelConfirmMeta({
      primaryText: primary.text,
      activityName: detail.name,
      reason: primaryReason,
    });

    Modal.confirm({
      title: confirm.title,
      content: confirm.content,
      okText: confirm.okText,
      cancelText: confirm.cancelText,
      onOk: async () => {
        await applyFlow.startCancelWithNotify(activityId);
      },
    });
  }, [activityId, detail, isCancel, applyFlow, primary, primaryReason]);

  const resultKind =
    applyFlow.modal.kind === "REGISTER_OK"
      ? "REGISTER_SUCCESS"
      : "REGISTER_FAIL";

  const applyTag = useMemo(
    () => getApplyStateTagMeta(applyState),
    [applyState],
  );

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
              返回
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              活动/讲座详情
            </Title>
          </Space>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void reload()}
              loading={loading}
            >
              刷新
            </Button>

            <Button
              type={isCancel ? "default" : "primary"}
              danger={isCancel}
              onClick={() => void onPrimaryClick()}
              loading={!!primaryLoading}
              disabled={primaryDisabled}
            >
              {primary.text}
            </Button>
          </Space>
        </Space>

        {primaryDisabled && isCancel ? (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{primaryReason}</Text>
          </div>
        ) : null}
      </Card>

      <Card>
        <Spin spinning={loading}>
          {error ? (
            <Text type="danger">加载失败，请刷新重试</Text>
          ) : detail ? (
            <Descriptions
              size="middle"
              column={2}
              labelStyle={{ width: 120 }}
              items={[
                { key: "name", label: "名称", children: detail.name },
                {
                  key: "type",
                  label: "类型",
                  children: <Tag>{activityTypeLabel(detail.type)}</Tag>,
                },
                {
                  key: "state",
                  label: "活动状态",
                  children: <Tag>{activityStateLabel(detail.state)}</Tag>,
                },
                {
                  key: "applyState",
                  label: "我的报名状态",
                  children: <Tag color={applyTag.color}>{applyTag.label}</Tag>,
                },
                {
                  key: "department",
                  label: "发布部门",
                  children: detail.department ?? "-",
                },
                {
                  key: "location",
                  label: "地点",
                  children: detail.location ?? "-",
                },
                {
                  key: "score",
                  label: "分数/次数",
                  children: detail.score ?? "-",
                },
                {
                  key: "fullNum",
                  label: "总人数",
                  children: detail.fullNum ?? "-",
                },
                {
                  key: "registeredNum",
                  label: "已报名",
                  children: detail.registeredNum ?? "-",
                },
                {
                  key: "candidateNum",
                  label: "候补数",
                  children: detail.candidateNum ?? "-",
                },
                {
                  key: "signStartTime",
                  label: "报名开始",
                  children: detail.signStartTime ?? "-",
                },
                {
                  key: "signEndTime",
                  label: "报名结束",
                  children: detail.signEndTime ?? "-",
                },
                {
                  key: "activityStime",
                  label: "活动开始",
                  children: detail.activityStime ?? "-",
                },
                {
                  key: "activityEtime",
                  label: "活动结束",
                  children: detail.activityEtime ?? "-",
                },
                {
                  key: "desc",
                  label: "描述",
                  children: (
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {detail.description ?? "-"}
                    </div>
                  ),
                  span: 2,
                },
              ]}
            />
          ) : (
            <Text type="secondary">暂无详情数据</Text>
          )}
        </Spin>
      </Card>

      {/* ✅ 报名结果弹窗（成功/失败 + 失败可候补） */}
      <ApplyResultModal
        open={applyFlow.modal.open}
        kind={resultKind}
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
    </Space>
  );
}
