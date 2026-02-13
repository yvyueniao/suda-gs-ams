// src/pages/activity-apply/ActivityDetailPage.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";

import {
  searchActivityById,
  getMyApplications,
} from "../../features/activity-apply/api";
import type {
  ActivityItem,
  MyApplicationItem,
  ApplyActionState,
} from "../../features/activity-apply/types";
import {
  buildMyApplicationMap,
  canCancelBy12h,
  deriveApplyActionState,
  inSignWindow,
} from "../../features/activity-apply/table/helpers";
import { useApplyActions } from "../../features/activity-apply/hooks/useApplyActions";

const { Title, Text, Paragraph } = Typography;

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

function applyStateLabel(s: ApplyActionState) {
  const map: Record<ApplyActionState, string> = {
    NOT_APPLIED: "未报名",
    APPLIED: "报名成功",
    CANDIDATE: "候补中",
    CANDIDATE_SUCC: "候补成功",
    CANDIDATE_FAIL: "候补失败",
    REVIEWING: "审核中",
    REVIEW_FAIL: "审核失败",
  };
  return map[s] ?? "-";
}

function applyStateColor(s: ApplyActionState) {
  if (s === "APPLIED" || s === "CANDIDATE_SUCC") return "green";
  if (s === "CANDIDATE") return "blue";
  if (s === "REVIEWING") return "gold";
  if (s === "CANDIDATE_FAIL" || s === "REVIEW_FAIL") return "red";
  return "default";
}

function primaryActionText(s: ApplyActionState) {
  switch (s) {
    case "APPLIED":
    case "CANDIDATE_SUCC":
      return "取消报名";
    case "CANDIDATE":
      return "取消候补";
    case "REVIEWING":
      return "取消审核";
    default:
      return "报名";
  }
}

export default function ActivityDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(false);

  // ✅ 只存 string，彻底消灭 unknown -> ReactNode 问题
  const [errorText, setErrorText] = useState<string | null>(null);

  const [detail, setDetail] = useState<ActivityItem | null>(null);
  const [myApp, setMyApp] = useState<MyApplicationItem | null>(null);

  const nowMs = Date.now();

  const applyActions = useApplyActions({
    onChanged: async () => {
      await reload();
    },
    muteActionErrorToast: true,
  });

  const applyState = useMemo(
    () => deriveApplyActionState(myApp ?? undefined),
    [myApp],
  );

  const signOk = useMemo(() => {
    if (!detail) return false;
    return inSignWindow(detail, nowMs);
  }, [detail, nowMs]);

  const cancelOk = useMemo(() => {
    if (!detail) return false;
    return canCancelBy12h(detail, nowMs);
  }, [detail, nowMs]);

  const disabledReason = useMemo(() => {
    if (!detail) return "";
    if (!signOk) return "不在报名时间范围内，暂不可操作";
    const t = primaryActionText(applyState);
    const isCancel = t === "取消报名" || t === "取消候补" || t === "取消审核";
    if (isCancel && !cancelOk) return "距离活动开始不足 12 小时，无法取消";
    return "";
  }, [detail, signOk, applyState, cancelOk]);

  const reload = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;

    setLoading(true);
    setErrorText(null);

    try {
      const [d, apps] = await Promise.all([
        searchActivityById({ id }),
        getMyApplications(),
      ]);

      setDetail(d.activity ?? null);

      const map = buildMyApplicationMap(apps ?? []);
      setMyApp(map.get(id) ?? null);
    } catch (e: unknown) {
      // ✅ 只把错误转成 string 保存
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
            ? e.message
            : "加载失败，请点击“刷新”重试";
      setErrorText(msg);
      setDetail(null);
      setMyApp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRegister = useCallback(async () => {
    if (!detail) return;

    if (!signOk) {
      message.warning(disabledReason || "当前不可报名");
      return;
    }

    const r = await applyActions.register(detail.id);

    if (r.ok) {
      Modal.success({
        title: "报名成功",
        content: r.msg,
        okText: "知道了",
      });
      return;
    }

    Modal.confirm({
      title: "报名失败",
      content: (
        <Space direction="vertical">
          <Text type="danger">{r.msg}</Text>
          <Text type="secondary">你可以选择加入候补（如后端允许）。</Text>
        </Space>
      ),
      okText: "去候补",
      cancelText: "知道了",
      onOk: async () => {
        const c = await applyActions.candidate(detail.id);
        if (c.ok) {
          Modal.success({
            title: "候补成功",
            content: c.msg,
            okText: "知道了",
          });
        } else {
          Modal.error({
            title: "候补失败",
            content: c.msg,
            okText: "知道了",
          });
        }
      },
    });
  }, [applyActions, detail, signOk, disabledReason]);

  const handleCandidate = useCallback(async () => {
    if (!detail) return;

    if (!signOk) {
      message.warning(disabledReason || "当前不可候补");
      return;
    }

    const c = await applyActions.candidate(detail.id);
    if (c.ok) {
      Modal.success({ title: "候补成功", content: c.msg, okText: "知道了" });
    } else {
      Modal.error({ title: "候补失败", content: c.msg, okText: "知道了" });
    }
  }, [applyActions, detail, signOk, disabledReason]);

  const handleCancel = useCallback(async () => {
    if (!detail) return;

    if (!signOk) {
      message.warning(disabledReason || "当前不可取消");
      return;
    }
    if (!cancelOk) {
      message.warning(disabledReason || "距离活动开始不足 12 小时，无法取消");
      return;
    }

    const r = await applyActions.cancel(detail.id);
    if (r.ok) {
      Modal.success({ title: "取消成功", content: r.msg, okText: "知道了" });
    } else {
      Modal.error({ title: "取消失败", content: r.msg, okText: "知道了" });
    }
  }, [applyActions, detail, signOk, cancelOk, disabledReason]);

  const primaryText = primaryActionText(applyState);
  const isCancel =
    primaryText === "取消报名" ||
    primaryText === "取消候补" ||
    primaryText === "取消审核";

  const primaryLoading = detail
    ? applyActions.rowAction.isLoading(detail.id)
    : false;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button onClick={() => navigate(-1)}>返回</Button>
        <Button onClick={() => void reload()} loading={loading}>
          刷新
        </Button>
      </Space>

      <Card>
        <Title level={3} style={{ marginBottom: 0 }}>
          活动/讲座详情
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          详情页的报名/候补/取消逻辑与列表页保持一致（最终以接口返回为准）。
        </Paragraph>
      </Card>

      {errorText && (
        <Alert
          type="error"
          showIcon
          message="加载失败"
          description={errorText}
        />
      )}

      <Card>
        <Spin spinning={loading}>
          {!detail ? (
            <Alert type="info" showIcon message="暂无数据" />
          ) : (
            <>
              <Space
                style={{ width: "100%", justifyContent: "space-between" }}
                wrap
              >
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    {detail.name}
                  </Title>
                  <Tag>{activityTypeLabel(detail.type)}</Tag>
                  <Tag>{activityStateLabel(detail.state)}</Tag>
                </Space>

                <Space>
                  <Tag color={applyStateColor(applyState)}>
                    {applyStateLabel(applyState)}
                  </Tag>

                  <Button
                    type={!isCancel ? "primary" : "default"}
                    danger={isCancel}
                    disabled={!!disabledReason}
                    loading={primaryLoading}
                    onClick={isCancel ? handleCancel : handleRegister}
                  >
                    {primaryText}
                  </Button>

                  {applyState === "NOT_APPLIED" && (
                    <Button
                      disabled={!signOk}
                      loading={primaryLoading}
                      onClick={handleCandidate}
                    >
                      候补
                    </Button>
                  )}
                </Space>
              </Space>

              {disabledReason && (
                <>
                  <Divider />
                  <Alert type="warning" showIcon message={disabledReason} />
                </>
              )}

              <Divider />

              <Descriptions
                size="small"
                column={2}
                labelStyle={{ width: 110 }}
                items={[
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
                    label: "加分",
                    children: detail.score ?? "-",
                  },
                  {
                    key: "fullNum",
                    label: "总人数",
                    children: detail.fullNum ?? "-",
                  },
                  {
                    key: "registeredNum",
                    label: "已报名人数",
                    children: detail.registeredNum ?? "-",
                  },
                  {
                    key: "candidateNum",
                    label: "候补人数",
                    children: detail.candidateNum ?? "-",
                  },
                  {
                    key: "time",
                    label: "创建时间",
                    children: detail.time ?? "-",
                  },
                  {
                    key: "signStartTime",
                    label: "报名开始",
                    children: detail.signStartTime ?? "-",
                  },
                  {
                    key: "signEndTime",
                    label: "报名截止",
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
                ]}
              />

              <Divider />

              <Title level={5} style={{ marginTop: 0 }}>
                活动描述
              </Title>
              <Paragraph style={{ marginBottom: 0 }}>
                {detail.description || "-"}
              </Paragraph>
            </>
          )}
        </Spin>
      </Card>
    </Space>
  );
}
