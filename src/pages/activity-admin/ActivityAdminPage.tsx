// src/pages/activity-admin/ActivityAdminPage.tsx

/**
 * ActivityAdminPage
 *
 * 职责：
 * - 活动/讲座管理列表页（UI 层）
 * - 组合：
 *   - useActivityAdminPage（业务编排聚合：table + modal + submit + isDeleting + navigateToDetail）
 *   - SmartTable / TableToolbar / ColumnSettings（通用表格体系）
 *   - ActivityUpsertModal（创建/修改复用弹窗）
 *
 * 约定：
 * - 页面层只做 UI + 交互，不直接 request
 * - 权限只做“可见/可点”控制：使用 <Can />
 */

import { useMemo } from "react";
import { Button, Card, Space, Typography } from "antd";
import type { FilterValue } from "antd/es/table/interface";

import {
  TableToolbar,
  SmartTable,
  ColumnSettings,
} from "../../shared/components/table";

import { Can } from "../../shared/components/guard/Can";

import { useActivityAdminPage } from "../../features/activity-admin/hooks/useActivityAdminPage";
import { buildActivityAdminColumns } from "../../features/activity-admin/table/columns";
import { activityAdminColumnPresets } from "../../features/activity-admin/table/presets";

import ActivityUpsertModal from "./ActivityUpsertModal";

const { Title } = Typography;

export default function ActivityAdminPage() {
  const m = useActivityAdminPage();
  const t = m.table;

  const columns = useMemo(() => {
    const base = buildActivityAdminColumns({
      onEdit: (record) => m.modal.openEdit(record),
      onDelete: (record) => m.submitDelete(record),
      onDetail: (record) => m.navigateToDetail(record.id),
      isDeleting: (id) => m.isDeleting(id),
    });

    return t.applyPresetsToAntdColumns(base);
  }, [m, t]);

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        活动 / 讲座管理
      </Title>

      <TableToolbar
        left={<strong style={{ fontSize: 14 }}>可管理活动列表</strong>}
        showSearch
        searchMode="change"
        debounceMs={300}
        searchPlaceholder="按活动名称搜索"
        keyword={t.query.keyword}
        onKeywordChange={t.setKeyword}
        onReset={t.reset}
        onRefresh={t.reload}
        loading={t.loading}
        right={
          <Space>
            {/* 创建：干事(3)不可见/不可操作；这里只做 UI 控制，后端仍必须鉴权 */}
            <Can roles={[0, 1, 2]}>
              <Button type="primary" onClick={m.modal.openCreate}>
                新建活动 / 讲座
              </Button>
            </Can>

            <Button onClick={() => t.exportCsv()} loading={t.exporting}>
              导出 CSV
            </Button>

            <ColumnSettings
              presets={activityAdminColumnPresets}
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
        bizKey="activity.admin"
        enableColumnResize
        sticky
        columns={columns}
        dataSource={t.rows}
        rowKey="id"
        query={t.query}
        total={t.total}
        loading={t.loading}
        error={t.error}
        onQueryChange={t.onQueryChange}
        /** ✅ 关键：把 antd filters 写回 query.filters，否则 applyLocalQuery 永远拿不到筛选条件 */
        onFiltersChange={(filters: Record<string, FilterValue | null>) => {
          // 1) 清洗：去掉 null / 空数组，避免“看似有 filters 实则无效”的情况
          const cleaned = Object.fromEntries(
            Object.entries(filters).filter(
              ([, v]) => v != null && (!Array.isArray(v) || v.length > 0),
            ),
          );

          // 2) 写回业务 query.filters（你们本地过滤逻辑只关心 type/state，但这里保持通用结构）
          t.setFilters(cleaned as any);

          // 3) 筛选变化时回到第一页（更符合用户预期）
          t.onQueryChange({ page: 1 });
        }}
      />

      {/* 新建/修改复用弹窗：useActivityAdminPage 已经把 open/mode/editing 聚合好了 */}
      <ActivityUpsertModal
        open={m.modal.open}
        mode={m.modal.mode}
        editing={m.modal.editing}
        onCancel={m.modal.close}
        onSuccess={async () => {
          m.modal.close();
          await t.reload();
        }}
        onSubmitCreate={m.submitCreate}
        onSubmitUpdate={m.submitUpdate}
      />
    </Card>
  );
}
