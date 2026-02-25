// src/pages/feedback-admin/FeedbackAdminPage.tsx
//
// FeedbackAdminPage（UI 渲染层）
//
// 职责：
// - 管理员端：反馈处理列表页（/feedback-admin）
// - 数据：展示“所有人的反馈列表”（features/feedback/hooks/useFeedbackListPage mode=all）
// - 前端本地实现：分页 / 搜索 / 筛选 / 排序 / 导出 / 列配置 / 列宽拖拽
// - 操作列：仅“详情”（不在列表页放结束按钮；结束在详情页里做）
//
// 约定：
// - ✅ 页面层只做 UI + 交互，不直接 request
// - ✅ 列表页搜索：title + name（兜底 username）
// - ✅ 详情跳转：隐藏路由，并把 title/state 通过 navigate state 传过去（详情页不额外 request title）

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Card, Space, Typography } from "antd";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../shared/components/table";

import type { FeedbackSessionItem } from "../../features/feedback/types";
import { useFeedbackListPage } from "../../features/feedback/hooks/useFeedbackListPage";

const { Title } = Typography;

export default function FeedbackAdminPage() {
  const navigate = useNavigate();

  const onDetail = useCallback(
    (record: FeedbackSessionItem) => {
      navigate(`/feedback/detail/${record.sessionId}`, {
        state: {
          title: record.title,
          state: record.state,
        },
      });
    },
    [navigate],
  );

  const table = useFeedbackListPage({
    mode: "all",
    onDetail,
  });

  const columns = useMemo(() => {
    // applyPresetsToAntdColumns：把“列宽/显隐/顺序”等偏好应用到 antd columns 上
    // 你们不同模块里该函数签名可能略有差异，这里按“最常见的三参/可选参”写法使用
    return (table.applyPresetsToAntdColumns as any)(
      table.baseColumns,
      table.visibleKeys,
      table.orderedKeys,
    );
  }, [table]);

  const rightActions = (
    <Space wrap>
      <Button onClick={() => table.exportCsv()} loading={table.exporting}>
        导出 CSV
      </Button>

      <ColumnSettings
        presets={table.presets}
        visibleKeys={table.visibleKeys}
        onChange={table.setVisibleKeys}
        orderedKeys={table.orderedKeys}
        onOrderChange={table.setOrderedKeys}
        onReset={table.resetToDefault}
        disabled={table.loading}
      />
    </Space>
  );

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            反馈处理
          </Title>
        </Space>
      }
    >
      <TableToolbar
        showSearch
        searchMode="change"
        debounceMs={300}
        keyword={table.query.keyword}
        onKeywordChange={table.setKeyword}
        searchPlaceholder="搜索：标题 / 姓名"
        loading={table.loading}
        onRefresh={table.reload}
        onReset={table.reset}
        left={
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              反馈列表
            </Title>
          </Space>
        }
        right={rightActions}
      />
      <SmartTable<FeedbackSessionItem, Record<string, any>>
        bizKey="feedback.all"
        rowKey="sessionId"
        columns={columns}
        scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
        dataSource={table.rows}
        loading={table.loading}
        error={table.error}
        query={table.query as any}
        total={table.total}
        onQueryChange={table.onQueryChange as any}
        onFiltersChange={(filters) => table.onQueryChange({ filters } as any)}
        enableColumnResize
        sticky
      />
    </Card>
  );
}
