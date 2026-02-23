// src/pages/feedback-center/FeedbackCenterPage.tsx
//
// FeedbackCenterPage（普通用户：我的反馈列表页）
//
// 职责：
// - 展示“我的反馈”列表（useFeedbackListPage(mode="mine")）
// - 支持：前端分页 / 搜索（title）/ 排序 / 筛选（state）/ 导出 / 列设置 / 列宽拖拽（如 SmartTable 开启）
// - 提供“创建反馈”按钮（弹窗）
// - 操作列：进入详情页（隐藏路由 /feedback/detail/:sessionId）
//
// 约定：
// - ✅ 页面层只做 UI 交互（弹窗开关、跳转、toast）
// - ✅ 列表编排：useFeedbackListPage（返回 rows/total/query/列偏好/导出 等一揽子）
// - ✅ 普通用户端不出现“结束反馈”按钮

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Card, Space, Typography } from "antd";

import {
  SmartTable,
  TableToolbar,
  ColumnSettings,
} from "../../shared/components/table";

import { notify } from "../../shared/ui";

import type { FeedbackSessionItem } from "../../features/feedback/types";
import { createFeedback as createFeedbackApi } from "../../features/feedback/api";
import { useFeedbackListPage } from "../../features/feedback/hooks/useFeedbackListPage";

import CreateFeedbackModal from "../feedback/CreateFeedbackModal";

const { Title } = Typography;

export default function FeedbackCenterPage() {
  const navigate = useNavigate();

  /**
   * 1) 详情跳转（给 useFeedbackListPage 作为 onDetail）
   */
  const handleDetail = useCallback(
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

  /**
   * 2) 列表页编排（mode="mine"）
   *    ⚠️ 注意：你的 useFeedbackListPage 需要 onDetail（必填）
   */
  const list = useFeedbackListPage({
    mode: "mine",
    onDetail: handleDetail,
  });

  /**
   * 3) 创建反馈弹窗
   *    ⚠️ 你当前 useFeedbackListPage 没暴露 createFeedback，所以这里直接调 api + reload
   */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const submitCreate = useCallback(
    async (payload: { title: string }) => {
      try {
        setCreating(true);
        await createFeedbackApi(payload);
        notify({ kind: "success", msg: "创建成功" });
        closeCreate();
        await list.reload();
        return true;
      } catch (e) {
        notify({
          kind: "error",
          msg: e instanceof Error ? e.message : "创建失败",
        });
        return false;
      } finally {
        setCreating(false);
      }
    },
    [closeCreate, list],
  );

  /**
   * 4) columns：useFeedbackListPage 已经构建了 baseColumns（含操作列）
   *    再叠加列偏好（显隐/顺序/宽度）
   */
  const antdColumns = useMemo(() => {
    return list.applyPresetsToAntdColumns(list.baseColumns);
  }, [list]);

  /**
   * 5) ColumnSettings：你们组件是“内部自带按钮 + 内部管理 open”
   *    props 是：presets / visibleKeys / onChange / orderedKeys / onOrderChange / onReset
   */
  const handleVisibleKeysChange = useCallback(
    (nextVisibleKeys: string[]) => {
      list.setVisibleKeys(nextVisibleKeys);
    },
    [list],
  );

  const handleOrderedKeysChange = useCallback(
    (nextOrderedKeys: string[]) => {
      list.setOrderedKeys(nextOrderedKeys);
    },
    [list],
  );

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            我的反馈
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Button type="primary" onClick={openCreate}>
            创建反馈
          </Button>
        </Space>
      }
    >
      {/* 工具条：本地过滤建议用 change + debounce */}
      <TableToolbar
        showSearch
        keyword={list.query.keyword}
        onKeywordChange={list.setKeyword}
        searchMode="change"
        debounceMs={200}
        onReset={list.reset}
        onRefresh={list.reload}
        loading={list.loading}
        left={
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              反馈列表
            </Title>
          </Space>
        }
        right={
          <Space>
            <Button onClick={() => list.exportCsv()} loading={list.exporting}>
              导出
            </Button>

            <ColumnSettings
              presets={list.presets}
              visibleKeys={list.visibleKeys}
              onChange={handleVisibleKeysChange}
              orderedKeys={list.orderedKeys}
              onOrderChange={handleOrderedKeysChange}
              onReset={list.resetToDefault}
            />
          </Space>
        }
      />

      <SmartTable<FeedbackSessionItem, Record<string, any>>
        bizKey="feedback.mine"
        rowKey="sessionId"
        loading={list.loading}
        error={list.error}
        dataSource={list.rows}
        columns={antdColumns}
        query={list.query}
        total={list.total}
        onQueryChange={list.onQueryChange}
        onFiltersChange={(filters) => list.onQueryChange({ filters })}
        enableColumnResize
      />

      <CreateFeedbackModal
        open={createOpen}
        loading={creating}
        onCancel={closeCreate}
        onSubmit={submitCreate}
      />
    </Card>
  );
}
