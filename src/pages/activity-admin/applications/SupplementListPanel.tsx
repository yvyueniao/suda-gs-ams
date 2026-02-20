// src/pages/activity-admin/applications/SupplementListPanel.tsx

/**
 * SupplementListPanel
 *
 * 职责：
 * - ActivityAdminDetailPage 下方 Tab 面板之一：补报名人员列表（Supplements）
 * - 纯 UI + 交互层：
 *   - 组合：useSupplementListTable（业务编排） + SmartTable/TableToolbar/ColumnSettings（通用表格）
 *   - 支持：前端分页 / 搜索 / 排序 / 筛选 / 导出 / 列设置 / 列宽拖拽
 *
 * 补报名审核：
 * - columns.tsx 内 ActionCell 已自带 confirm（二次确认）
 * - 面板只负责把 approve/reject/isAuditing 传进去
 *
 * 约定：
 * - 不直接 request
 * - 不维护按钮 loading（由 hook 提供 isAuditing）
 */

import { useMemo } from "react";
import { Card, Space, Button } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { useSupplementListTable } from "../../../features/activity-admin/applications/hooks/useSupplementListTable";

import { buildSupplementsColumns } from "../../../features/activity-admin/applications/table/supplements/columns";
import { activityAdminSupplementsColumnPresets } from "../../../features/activity-admin/applications/table/supplements/presets";

export type SupplementListPanelProps = {
  /** 当前详情页活动ID */
  activityId: number;
};

export default function SupplementListPanel(props: SupplementListPanelProps) {
  const { activityId } = props;

  const t = useSupplementListTable(activityId);

  const columns = useMemo(() => {
    const base = buildSupplementsColumns({
      // ✅ 对齐 hook：approve / reject
      onApprove: (row) => t.approve(row),
      onReject: (row) => t.reject(row),

      // ✅ 对齐 hook：isAuditing(username)
      isAuditing: (username) => t.isAuditing(username),
    });

    return t.applyPresetsToAntdColumns(base);
  }, [t]);

  return (
    <Card size="small" bordered={false}>
      <TableToolbar
        left={<strong style={{ fontSize: 14 }}>补报名人员列表</strong>}
        showSearch
        searchMode="change"
        debounceMs={300}
        searchPlaceholder="按姓名搜索"
        keyword={t.query.keyword}
        onKeywordChange={t.setKeyword}
        onReset={t.reset}
        onRefresh={t.reload}
        loading={t.loading}
        right={
          <Space>
            <Button onClick={() => t.exportCsv()} loading={t.exporting}>
              导出 CSV
            </Button>

            <ColumnSettings
              presets={activityAdminSupplementsColumnPresets}
              visibleKeys={t.visibleKeys}
              onChange={t.setVisibleKeys}
              orderedKeys={t.orderedKeys}
              onOrderChange={t.setOrderedKeys}
              onReset={t.resetToDefault}
            />
          </Space>
        }
      />

      <SmartTable
        bizKey="activity.admin.supplements"
        enableColumnResize
        sticky
        columns={columns}
        dataSource={t.rows}
        rowKey={(r) => `${r.activityId}-${r.username}-${r.state}-${r.time}`}
        query={t.query}
        total={t.total}
        loading={t.loading}
        error={t.error}
        onQueryChange={t.onQueryChange}
        /** ✅ filters 写回 query.filters，applyLocalQuery 才能吃到筛选条件 */
        onFiltersChange={(filters: Record<string, FilterValue | null>) => {
          const cleaned = Object.fromEntries(
            Object.entries(filters).filter(
              ([, v]) => v != null && (!Array.isArray(v) || v.length > 0),
            ),
          );

          t.setFilters(cleaned as any);

          // 筛选变化回到第一页
          t.onQueryChange({ page: 1 });
        }}
      />
    </Card>
  );
}
