// src/pages/activity-admin/ActivityAdminPage.tsx

/**
 * ActivityAdminPage
 *
 * 职责：
 * - 活动/讲座管理列表页（UI 层）
 * - 组合：
 *   - useActivityAdminPage（业务编排聚合：table + modal + submit + navigateToDetail）
 *   - SmartTable / TableToolbar / ColumnSettings（通用表格体系）
 *   - ActivityUpsertModal（创建/修改复用弹窗）
 *
 * 约定：
 * - 页面层只做 UI + 交互，不直接 request
 * - 权限只做“可见/可点”控制：使用 <Can />
 * - ✅ 删除 toast 优先使用后端返回的 msg（data:string）
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
import { useAsyncMapAction } from "../../shared/actions";

import { useActivityAdminPage } from "../../features/activity-admin/hooks/useActivityAdminPage";
import { buildActivityAdminColumns } from "../../features/activity-admin/table/columns";
import { activityAdminColumnPresets } from "../../features/activity-admin/table/presets";

import ActivityUpsertModal from "./ActivityUpsertModal";

const { Title } = Typography;

export default function ActivityAdminPage() {
  const m = useActivityAdminPage();
  const t = m.table;

  /**
   * ✅ 删除：页面层统一做 loading + toast（并尽量用后端返回信息）
   */
  const del = useAsyncMapAction<number, string>({
    successMessage: (_id, result) => String(result ?? "").trim() || "删除成功",
    errorMessage: "删除失败",
  });

  const columns = useMemo(() => {
    const base = buildActivityAdminColumns({
      onEdit: (record) => m.modal.openEdit(record),

      // ✅ 用页面层 del 包一层：负责 toast + 行级 loading
      onDelete: (record) => del.run(record.id, () => m.submitDelete(record)),

      onDetail: (record) => m.navigateToDetail(record.id),

      // ✅ 行级 loading
      isDeleting: (id) => del.isLoading(id),
    });

    return t.applyPresetsToAntdColumns(base);
  }, [m, t, del]);

  return (
    <Card
      title={
        <Space
          style={{ width: "100%", justifyContent: "space-between" }}
          align="center"
          wrap
        >
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              活动/讲座管理
            </Title>
          </Space>

          <Can roles={[0, 1, 2]}>
            <Button type="primary" onClick={m.modal.openCreate}>
              新建活动 / 讲座
            </Button>
          </Can>
        </Space>
      }
    >
      <TableToolbar
        left={
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              可管理的活动/讲座列表
            </Title>
          </Space>
        }
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
