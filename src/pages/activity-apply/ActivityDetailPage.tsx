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
   * nowMs：用于“报名时间窗”判断
   * - 这里仍然保持你原来的策略：在“详情/状态变化”时更新一次
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
   * ✅ 报名/取消 都受 “报名时间窗” 影响：
   * - 报名：窗外禁用（灰色不可点）
   * - 取消：窗外禁用（灰色不可点）
   *
   * 说明：
   * - 你现在删除了 12h 规则，所以这里只看 signOk
   */
  const primaryDisabled = useMemo(() => {
    if (!detail) return true;
    return !signOk;
  }, [detail, signOk]);

  const primaryReason = useMemo(() => {
    if (!detail) return "暂无详情数据";
    if (!signOk) return "不在报名时间范围内";
    return undefined;
  }, [detail, signOk]);

  /**
   * ✅ 成功申请数（成功报名 + 成功候补）
   * - 优先使用后续在数据层补齐的 detail.successApplyNum
   * - 若详情接口未补齐，则本地兜底计算
   */
  const successApplyNum = useMemo(() => {
    if (!detail) return null;

    if (typeof (detail as any).successApplyNum === "number") {
      return (detail as any).successApplyNum as number;
    }

    const registeredNum =
      typeof detail.registeredNum === "number" ? detail.registeredNum : 0;

    const candidateSuccNum =
      typeof (detail as any).candidateSuccNum === "number"
        ? ((detail as any).candidateSuccNum as number)
        : 0;

    return registeredNum + candidateSuccNum;
  }, [detail]);

  const primaryLoading = useMemo(() => {
    if (activityId == null) return false;
    return applyActions.rowAction.isLoading(activityId);
  }, [activityId, applyActions]);

  const onPrimaryClick = useCallback(async () => {
    if (activityId == null || !detail) return;

    // ✅ 双保险：即使未来 Button disabled 逻辑改了，这里也不会误触发请求
    if (!signOk) return;

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
  }, [activityId, detail, signOk, isCancel, applyFlow, primary, primaryReason]);

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

        {/* ✅ 窗外禁用提示：报名/取消都提示 */}
        {primaryDisabled ? (
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

                // ✅ 关键改动：已报名 -> 成功申请（成功报名 + 成功候补）
                {
                  key: "successApplyNum",
                  label: "成功申请",
                  children: successApplyNum ?? "-",
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
