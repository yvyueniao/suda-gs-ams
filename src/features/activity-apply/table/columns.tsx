// src/features/activity-apply/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";
import { ActionCell } from "../../../shared/components/table";
import type { ApplyActionState, EnrollTableRow } from "../types";

type BuildColumnsParams = {
  nowMs?: number;

  /** （你目前不打算做部门筛选的话，这个可以先留着不传） */
  departmentFilters?: Array<{ text: string; value: string }>;

  isRegistering?: (id: number) => boolean;
  isCanceling?: (id: number) => boolean;

  onRegister: (record: EnrollTableRow) => void | Promise<unknown>;
  onCancel: (record: EnrollTableRow) => void | Promise<unknown>;
  onDetail: (record: EnrollTableRow) => void;
};

/* =====================================================
 * 工具
 * ===================================================== */

function parseTimeMs(s?: string): number | null {
  if (!s) return null;
  const iso = s.replace(" ", "T");
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function inSignWindow(row: EnrollTableRow, nowMs: number): boolean {
  const start = parseTimeMs(row.signStartTime);
  const end = parseTimeMs(row.signEndTime);
  if (start == null || end == null) return false;
  return nowMs >= start && nowMs <= end;
}

function canCancelBy12h(row: EnrollTableRow, nowMs: number): boolean {
  const start = parseTimeMs(row.activityStime);
  if (start == null) return true;
  return start - nowMs >= 12 * 60 * 60 * 1000;
}

/* =====================================================
 * 映射
 * ===================================================== */

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

/**
 * ✅ 你的真实诉求：
 * - 只有 NOT_APPLIED（我的记录里没有）才显示“报名”
 * - 其余状态沿用原来的取消逻辑（取消报名/取消候补/取消审核）
 * - 但列表里不提供“候补”入口（候补只在报名失败弹窗）
 */
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
      // NOT_APPLIED / CANDIDATE_FAIL / REVIEW_FAIL 仍显示“报名”（入口统一）
      return "报名";
  }
}

/* =====================================================
 * 列工厂
 * ===================================================== */

export function buildEnrollColumns(
  params: BuildColumnsParams,
): ColumnsType<EnrollTableRow> {
  const {
    nowMs = Date.now(),
    departmentFilters, // 目前不用也没关系
    onRegister,
    onCancel,
    onDetail,
    isRegistering,
    isCanceling,
  } = params;

  return [
    {
      title: "编号",
      dataIndex: "id",
      key: "id",
      width: 96,
      sorter: true,
    },
    {
      title: "活动 / 讲座名称",
      dataIndex: "name",
      key: "name",
      width: 240,
      sorter: true,
      ellipsis: true,
    },
    {
      title: "发布部门",
      dataIndex: "department",
      key: "department",
      width: 160,
      sorter: true,
      // filters: departmentFilters,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      sorter: true,
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      render: (v: 0 | 1) => <Tag>{activityTypeLabel(v)}</Tag>,
    },
    // ✅ 分数/次数：只显示数字
    {
      title: "分数/次数",
      dataIndex: "score",
      key: "score",
      width: 120,
      sorter: true,
      render: (v: number | undefined) => (typeof v === "number" ? v : "-"),
    },
    {
      title: "活动状态",
      dataIndex: "state",
      key: "state",
      width: 120,
      sorter: true,
      filters: [
        { text: "未开始", value: 0 },
        { text: "报名中", value: 1 },
        { text: "报名结束", value: 2 },
        { text: "进行中", value: 3 },
        { text: "已结束", value: 4 },
      ],
      render: (v: 0 | 1 | 2 | 3 | 4) => <Tag>{activityStateLabel(v)}</Tag>,
    },
    {
      title: "报名开始时间",
      dataIndex: "signStartTime",
      key: "signStartTime",
      width: 180,
      sorter: true,
    },
    {
      title: "报名结束时间",
      dataIndex: "signEndTime",
      key: "signEndTime",
      width: 180,
      sorter: true,
    },
    {
      title: "活动开始时间",
      dataIndex: "activityStime",
      key: "activityStime",
      width: 180,
      sorter: true,
    },
    {
      title: "活动结束时间",
      dataIndex: "activityEtime",
      key: "activityEtime",
      width: 180,
      sorter: true,
    },
    {
      title: "地点",
      dataIndex: "location",
      key: "location",
      width: 160,
      sorter: true,
      ellipsis: true,
    },
    {
      title: "总人数",
      dataIndex: "fullNum",
      key: "fullNum",
      width: 100,
      sorter: true,
    },
    {
      title: "已报名",
      dataIndex: "registeredNum",
      key: "registeredNum",
      width: 100,
      sorter: true,
    },
    {
      title: "候补数",
      dataIndex: "candidateNum",
      key: "candidateNum",
      width: 100,
      sorter: true,
    },
    {
      title: "我的报名状态",
      dataIndex: "applyState",
      key: "applyState",
      width: 140,
      sorter: true,
      filters: [
        { text: "未报名", value: "NOT_APPLIED" },
        { text: "报名成功", value: "APPLIED" },
        { text: "候补中", value: "CANDIDATE" },
        { text: "候补成功", value: "CANDIDATE_SUCC" },
        { text: "候补失败", value: "CANDIDATE_FAIL" },
        { text: "审核中", value: "REVIEWING" },
        { text: "审核失败", value: "REVIEW_FAIL" },
      ],
      render: (_: unknown, record: EnrollTableRow) => (
        <Tag color={applyStateColor(record.applyState)}>
          {applyStateLabel(record.applyState)}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_: unknown, record: EnrollTableRow) => {
        const signOk = inSignWindow(record, nowMs);
        const cancelOk = canCancelBy12h(record, nowMs);

        const text = primaryActionText(record.applyState);
        const isCancel =
          text === "取消报名" || text === "取消候补" || text === "取消审核";

        // ✅ 报名按钮不做前置禁用（让后端返回 msg，交给“报名结果弹窗”处理）
        // ✅ 取消类动作才限制
        const primaryDisabled = isCancel ? !signOk || !cancelOk : false;

        const primaryLoading = isCancel
          ? isCanceling?.(record.id)
          : isRegistering?.(record.id);

        const primaryReason = isCancel
          ? !signOk
            ? "不在报名时间范围内"
            : !cancelOk
              ? "距离活动开始不足12小时"
              : undefined
          : undefined;

        const primaryClick = () => {
          if (!isCancel) return onRegister(record);
          return onCancel(record);
        };

        return (
          <ActionCell
            record={record}
            actions={[
              {
                key: "primary",
                label: text,
                danger: isCancel,
                loading: !!primaryLoading,
                disabled: primaryDisabled,
                confirm: isCancel
                  ? {
                      title: `确认取消${text === "取消报名" ? "报名" : "候补"}？`,
                      content: primaryReason
                        ? `${primaryReason}（仍确认继续？）`
                        : `活动：${record.name}`,
                      okText: "确认",
                      cancelText: "取消",
                    }
                  : undefined,
                onClick: primaryClick,
              },
              {
                key: "detail",
                label: "详情",
                onClick: () => onDetail(record),
              },
            ]}
          />
        );
      },
    },
  ];
}
