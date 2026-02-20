// src/pages/activity-admin/applications/RegisterListPanel.tsx

/**
 * RegisterListPanel
 *
 * 职责：
 * - ActivityAdminDetailPage 下方 Tab 面板之一：报名人员列表（Registers）
 * - 纯 UI + 交互层：
 *   - 组合：useRegisterListTable（业务编排） + SmartTable/TableToolbar/ColumnSettings（通用表格）
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

import { useRegisterListTable } from "../../../features/activity-admin/applications/hooks/useRegisterListTable";

import { buildRegistersColumns } from "../../../features/activity-admin/applications/table/registers/columns";
import { activityAdminRegistersColumnPresets } from "../../../features/activity-admin/applications/table/registers/presets";

export type RegisterListPanelProps = {
  /** 当前详情页活动ID */
  activityId: number;
};

export default function RegisterListPanel(props: RegisterListPanelProps) {
  const { activityId } = props;

  const t = useRegisterListTable(activityId);

  const columns = useMemo(() => {
    const base = buildRegistersColumns();
    return t.applyPresetsToAntdColumns(base);
  }, [t]);

  return (
    <Card size="small" bordered={false}>
      <TableToolbar
        left={<strong style={{ fontSize: 14 }}>报名人员列表</strong>}
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
              presets={activityAdminRegistersColumnPresets}
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
        bizKey="activity.admin.registers"
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
