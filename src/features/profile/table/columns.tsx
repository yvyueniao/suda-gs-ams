// src/features/profile/table/columns.tsx
/**
 * buildMyActivitiesColumns
 *
 * ✅ 文件定位
 * - 个人中心「我的活动/讲座」表格的 columns 工厂（纯“列定义层”）
 * - 只做：把 MyActivityItem -> antd ColumnsType 映射（格式化、Tag、筛选项、排序标记、操作列）
 * - 不做：
 *   - 拉数据 / 分页逻辑（交给 useProfileMyActivitiesTable + SmartTable）
 *   - message/toast（交给 shared/actions 或页面）
 *   - 弹窗 open/close 状态（交给 useProfileMyActivitiesTable）
 *
 * ✅ 和“封装异步操作按钮(ActionCell)”的关系
 * - 本文件只负责把“操作列”渲染成 <ActionCell />
 * - ActionCell 只负责：渲染 + 触发（可选 confirmAsync）
 * - 异步编排（loading/防重复/错误提示）应放在业务 Hook：
 *   - useAsyncMapAction：行内操作（按 activityId 独立 loading）
 *   - useAsyncAction：页面级单按钮操作
 *
 * ✅ 受控筛选闭环说明
 * - 这里仅声明 filters（候选项）
 * - filteredValue 由“编排层 Hook”把 query.filters 映射回 columns（见 useProfileMyActivitiesTable）
 * - antd filters 变化由 SmartTable.onFiltersChange 抛出，再由 Hook 更新 query.filters
 */

import type { ColumnsType } from "antd/es/table";
import { Tag, Typography } from "antd";

import { ActionCell } from "../../../shared/components/table";

import type { MyActivityItem } from "../types";
import { activityTypeLabel, applicationStateLabel, boolLabel } from "./helpers";

const { Text } = Typography;

export type MyActivitiesActions = {
  /**
   * 打开详情（可能异步：需要请求详情数据）
   * - 返回 void | Promise<void>，便于 ActionCell 支持 Promise
   */
  openDetail: (activityId: number) => void | Promise<void>;
};

export function buildMyActivitiesColumns(
  actions: MyActivitiesActions,
): ColumnsType<MyActivityItem> {
  const columns: ColumnsType<MyActivityItem> = [
    // =========================
    // 基础信息列
    // =========================
    {
      dataIndex: "activityName",
      title: "活动 / 讲座名称",
      ellipsis: true,
      render: (v: MyActivityItem["activityName"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
    },
    {
      dataIndex: "type",
      title: "类型",
      width: 100,
      filters: [
        { text: "活动", value: 0 },
        { text: "讲座", value: 1 },
      ],
      render: (v: MyActivityItem["type"] | undefined) => (
        <Tag>{activityTypeLabel(v)}</Tag>
      ),
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
      ],
      render: (v: MyActivityItem["state"] | undefined) => (
        <Tag>{applicationStateLabel(v)}</Tag>
      ),
    },
    {
      dataIndex: "time",
      title: "报名时间",
      width: 180,
      sorter: true, // SmartTable 会把 sorter 回传到 query.sorter
      render: (v: MyActivityItem["time"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
    },

    // =========================
    // 签到/签退/加分列
    // =========================
    {
      dataIndex: "checkIn",
      title: "签到",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v: MyActivityItem["checkIn"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "checkOut",
      title: "签退",
      width: 100,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v: MyActivityItem["checkOut"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "getScore",
      title: "可加分",
      width: 120,
      filters: [
        { text: "是", value: true },
        { text: "否", value: false },
      ],
      render: (v: MyActivityItem["getScore"] | undefined) => (
        <Text>{boolLabel(v)}</Text>
      ),
    },
    {
      dataIndex: "score",
      title: "分数",
      width: 80,
      sorter: true,
      render: (v: MyActivityItem["score"] | undefined | null) => (
        <Text>{String(v ?? "-")}</Text>
      ),
    },

    // =========================
    // 操作列（ActionCell 触发器）
    // =========================
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
              /**
               * ✅ 关键修复点
               * ActionCell 的 ActionItem.onClick 签名是：onClick(record) => void | Promise<void>
               * 所以这里必须用 onClick: (r) => ...
               * 不要写成 onClick: () => actions.openDetail(record.activityId)
               */
              onClick: (r) => actions.openDetail(r.activityId),
            },
          ]}
        />
      ),
    },
  ];

  return columns;
}
