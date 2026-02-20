// src/pages/activity-admin/applications/CandidateListPanel.tsx

/**
 * CandidateListPanel
 *
 * 职责：
 * - ActivityAdminDetailPage 下方 Tab 面板之一：候补人员列表（Candidates）
 * - 纯 UI + 交互层：
 *   - 组合：useCandidateListTable（业务编排） + SmartTable/TableToolbar/ColumnSettings（通用表格）
 *   - 支持：前端分页 / 搜索 / 排序 / 筛选 / 导出 / 列设置 / 列宽拖拽
 *
 * 约定：
 * - 不直接 request
 * - 不做 message/toast（交给 shared/actions）
 */

import { useMemo } from "react";
import { Card, Space, Button } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { useCandidateListTable } from "../../../features/activity-admin/applications/hooks/useCandidateListTable";

import { buildCandidatesColumns } from "../../../features/activity-admin/applications/table/candidates/columns";
import { activityAdminCandidatesColumnPresets } from "../../../features/activity-admin/applications/table/candidates/presets";

export type CandidateListPanelProps = {
  /** 当前详情页活动ID */
  activityId: number;
};

export default function CandidateListPanel(props: CandidateListPanelProps) {
  const { activityId } = props;

  const t = useCandidateListTable(activityId);

  const columns = useMemo(() => {
    const base = buildCandidatesColumns();
    return t.applyPresetsToAntdColumns(base);
  }, [t]);

  return (
    <Card size="small" bordered={false}>
      <TableToolbar
        left={<strong style={{ fontSize: 14 }}>候补人员列表</strong>}
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
            {/* ✅ 统一导出按钮样式：对齐 SupplementListPanel */}
            <Button onClick={() => t.exportCsv()} loading={t.exporting}>
              导出 CSV
            </Button>

            <ColumnSettings
              presets={activityAdminCandidatesColumnPresets}
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
        bizKey="activity.admin.candidates"
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
        /**
         * filters 写回 query.filters
         * - 本表 helpers.ts 只关心 state，但这里保持通用结构
         */
        onFiltersChange={(filters: Record<string, FilterValue | null>) => {
          const cleaned = Object.fromEntries(
            Object.entries(filters).filter(
              ([, v]) => v != null && (!Array.isArray(v) || v.length > 0),
            ),
          );

          t.setFilters(cleaned as any);
          t.onQueryChange({ page: 1 });
        }}
      />
    </Card>
  );
}
