// src/features/profile/table/columns.tsx

import type { ColumnsType } from "antd/es/table";
import { Tag, Typography, Tooltip } from "antd";

import { ActionCell } from "../../../shared/components/table";

import type { MyActivityItem } from "../types";
import { activityTypeLabel, applicationStateLabel, boolLabel } from "./helpers";

const { Text } = Typography;

/* =====================================================
 * 值归一化（解决 Table filters 传 string/number/boolean 混乱）
 * ===================================================== */

function normalizeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Number(v);
  return null;
}

function normalizeBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return null;
}

/* =====================================================
 * 颜色映射（统一语义）
 * ===================================================== */

function activityTypeMeta(type: MyActivityItem["type"]) {
  // ✅ 防御：后端可能给 "0"/"1"
  const t = normalizeNumber(type) ?? 0;

  return t === 0
    ? { label: activityTypeLabel(0), color: "blue" as const }
    : { label: activityTypeLabel(1), color: "purple" as const };
}

function applyStateMeta(state: MyActivityItem["state"]) {
  const label = applicationStateLabel(state);

  const colorMap: Record<number, string> = {
    0: "success",
    1: "processing",
    2: "success",
    3: "error",
    4: "gold",
    5: "error",
  };

  return {
    label,
    color: colorMap[state ?? -1] ?? "default",
  };
}

function boolMeta(v: boolean | undefined) {
  return v
    ? { label: boolLabel(v), color: "success" as const }
    : { label: boolLabel(v), color: "default" as const };
}

/** ✅ 是否加分：只有签到 && 签退 都为 true 才可加分 */
function canGetScore(record: Pick<MyActivityItem, "checkIn" | "checkOut">) {
  return Boolean(record.checkIn) && Boolean(record.checkOut);
}

/* =====================================================
 * 列工厂
 * ===================================================== */

export type MyActivitiesActions = {
  openDetail: (activityId: number) => void | Promise<void>;
};

export function buildMyActivitiesColumns(
  actions: MyActivitiesActions,
): ColumnsType<MyActivityItem> {
  const columns: ColumnsType<MyActivityItem> = [
    {
      dataIndex: "activityName",
      title: "活动 / 讲座名称",
      ellipsis: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      dataIndex: "type",
      title: "类型",
      width: 100,
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      // ✅ 关键：筛选值/数据值都归一化，确保 "0"/0 都能正确筛
      onFilter: (value, record) => {
        const fv = normalizeNumber(value);
        const rv = normalizeNumber(record.type);
        if (fv === null || rv === null) return false;
        return rv === fv;
      },
      render: (v) => {
        const meta = activityTypeMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "state",
      title: "报名状态",
      width: 120,
      filters: [
        { text: "报名成功", value: 0 },
        { text: "候补中", value: 1 },
        { text: "候补成功", value: 2 },
        { text: "候补失败", value: 3 },
        { text: "审核中", value: 4 },
        { text: "审核失败", value: 5 },
      ],
      render: (v) => {
        const meta = applyStateMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "time",
      title: "报名时间",
      width: 180,
      sorter: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      dataIndex: "checkIn",
      title: "是否签到",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      onFilter: (value, record) => {
        const fv = normalizeBoolean(value);
        const rv = normalizeBoolean(record.checkIn);
        if (fv === null || rv === null) return false;
        return rv === fv;
      },
      render: (v) => {
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "checkOut",
      title: "是否签退",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      onFilter: (value, record) => {
        const fv = normalizeBoolean(value);
        const rv = normalizeBoolean(record.checkOut);
        if (fv === null || rv === null) return false;
        return rv === fv;
      },
      render: (v) => {
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    /**
     * ✅ 新增：是否加分（派生列）
     */
    {
      key: "canScore",
      title: (
        <Tooltip title="当前活动，未签到/签退，就会无法加分" placement="top">
          <span>是否加分</span>
        </Tooltip>
      ),
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      // ✅ 修复点：不能用 Boolean(value)（"false" 也会变 true）
      onFilter: (value, record) => {
        const fv = normalizeBoolean(value);
        if (fv === null) return false;
        const rv = canGetScore(record);
        return rv === fv;
      },
      render: (_: unknown, record) => {
        const v = canGetScore(record);
        const meta = boolMeta(v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "getScore",
      title: (
        <Tooltip
          title="上次活动报名，但未签到/签退，就会收到惩罚，本次无法加分"
          placement="top"
        >
          <span>是否惩罚</span>
        </Tooltip>
      ),
      width: 100,
      filters: [
        { text: "否", value: true },
        { text: "是", value: false },
      ],
      // ✅ 同样做归一化（避免 value 变成 "false"/"true"）
      onFilter: (value, record) => {
        const fv = normalizeBoolean(value);
        if (fv === null) return false;

        // 你的含义：getScore=true => 没惩罚；getScore=false => 有惩罚
        // “是否惩罚”列显示的是 !getScore
        const punished = !Boolean(record.getScore);
        return punished === fv; // fv=true => 惩罚=是；fv=false => 惩罚=否
      },
      render: (v) => {
        const meta = boolMeta(!v);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },

    {
      dataIndex: "score",
      title: "分数/次数",
      width: 150,
      sorter: true,
      render: (v) => <Text>{String(v ?? "-")}</Text>,
    },

    {
      key: "actions",
      title: "操作",
      width: 120,
      fixed: "right",
      render: (_: unknown, record) => (
        <ActionCell
          record={record}
          maxVisible={2}
          actions={[
            {
              key: "detail",
              label: "详情",
              onClick: (r) => actions.openDetail(r.activityId),
            },
          ]}
        />
      ),
    },
  ];

  return columns;
}
