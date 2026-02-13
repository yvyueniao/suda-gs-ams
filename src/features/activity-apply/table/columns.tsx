// src/features/activity-apply/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag } from "antd";
import { ActionCell } from "../../../shared/components/table";
import type { EnrollTableRow } from "../types";

// ✅ 统一从 helpers 复用（唯一真相源）
import {
  inSignWindow,
  getPrimaryActionMeta,
  getApplyStateTagMeta,
  getCancelConfirmMeta,
} from "./helpers";

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
 * 映射（UI 轻量展示）
 * - 这俩是“列表列显示”所需，不属于动作逻辑
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

/* =====================================================
 * 列工厂
 * ===================================================== */

export function buildEnrollColumns(
  params: BuildColumnsParams,
): ColumnsType<EnrollTableRow> {
  const {
    nowMs = Date.now(),
    onRegister,
    onCancel,
    onDetail,
    isRegistering,
    isCanceling,
  } = params;

  return [
    { title: "编号", dataIndex: "id", key: "id", width: 96, sorter: true },
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
      render: (_: unknown, record: EnrollTableRow) => {
        const meta = getApplyStateTagMeta(record.applyState);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      title: "操作",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_: unknown, record: EnrollTableRow) => {
        // ✅ 现在只保留“报名时间窗限制”（12h 已删）
        const signOk = inSignWindow(record, nowMs);

        const primary = getPrimaryActionMeta(record.applyState);
        const isCancel = primary.isCancel;

        // ✅ 报名不前置禁用；取消只看是否在报名窗内
        const primaryDisabled = isCancel ? !signOk : false;

        const primaryLoading = isCancel
          ? isCanceling?.(record.id)
          : isRegistering?.(record.id);

        const reason = isCancel && !signOk ? "不在报名时间范围内" : undefined;

        const confirm = isCancel
          ? getCancelConfirmMeta({
              primaryText: primary.text,
              activityName: record.name,
              // helpers 里目前是可选的 reason：有就展示“仍确认继续？”
              reason,
            } as any)
          : undefined;

        const onClick = () => {
          if (!isCancel) return onRegister(record);
          return onCancel(record);
        };

        return (
          <ActionCell
            record={record}
            actions={[
              {
                key: "primary",
                label: primary.text,
                danger: isCancel,
                loading: !!primaryLoading,
                disabled: primaryDisabled,
                confirm: confirm
                  ? {
                      title: confirm.title,
                      content: confirm.content,
                      okText: confirm.okText,
                      cancelText: confirm.cancelText,
                    }
                  : undefined,
                onClick,
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
