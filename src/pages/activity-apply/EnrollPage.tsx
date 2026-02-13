// src/pages/activity-apply/EnrollPage.tsx

import { useCallback, useMemo } from "react";
import { Button, Card, Modal, Space, Spin, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../shared/components/table";

import { useEnrollPage } from "../../features/activity-apply/hooks/useEnrollPage";
import type { EnrollTableRow } from "../../features/activity-apply/types";

import { activityApplyTablePresets } from "../../features/activity-apply/table/presets";
import SupplementApplyModal from "./SupplementApplyModal";
import ApplyResultModal from "./ApplyResultModal";

const { Title, Text } = Typography;

export default function EnrollPage() {
  /**
   * ✅ 关键修复点：
   * - 确保 Hook（useEnrollPage）只在组件顶层调用
   * - 不要把 useEnrollPage / useAsyncMapAction 包在 useMemo/useEffect 里
   *
   * 同时把 onNotify 提到 useCallback，避免每次 render 传入新函数导致内部逻辑重复构建
   * （不改变原有行为，只让引用稳定）
   */
  const onNotify = useCallback(
    ({ kind, msg }: { kind: string; msg: string }) => {
      if (kind === "success") message.success(msg);
      else if (kind === "error") message.error(msg);
      else message.info(msg);
    },
    [],
  );

  const { table, detail, supplement, applyFlow } = useEnrollPage({ onNotify });

  // 把 flow 的 kind 映射到 ApplyResultModal 的 kind（不影响逻辑，仅做 memo 避免无意义重复计算）
  const resultKind = useMemo(() => {
    return applyFlow.modal.kind === "REGISTER_OK"
      ? "REGISTER_SUCCESS"
      : "REGISTER_FAIL";
  }, [applyFlow.modal.kind]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Title level={3} style={{ margin: 0 }}>
            活动/讲座报名
          </Title>

          <Button
            type="primary"
            size="large"
            onClick={() => supplement.openSupplement(0)}
          >
            补报名
          </Button>
        </Space>
      </Card>

      <Card>
        <TableToolbar
          keyword={table.query.keyword}
          onKeywordChange={(kw) => table.setKeyword(kw)}
          loading={table.loading}
          showSearch
          searchMode="change"
          debounceMs={300}
          left={
            <Space>
              <Text strong>活动 / 讲座列表</Text>
            </Space>
          }
          right={
            <Space>
              <Button
                onClick={() => table.resetQuery()}
                disabled={table.loading}
              >
                重置
              </Button>

              <Button
                onClick={() => table.exportCsv()}
                disabled={table.loading}
              >
                导出 CSV
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => table.reload()}
                loading={table.loading}
              >
                刷新
              </Button>

              <ColumnSettings
                presets={activityApplyTablePresets}
                visibleKeys={table.columnPrefs.visibleKeys}
                onChange={(keys) => table.columnPrefs.setVisibleKeys([...keys])}
                orderedKeys={table.columnPrefs.orderedKeys}
                onOrderChange={(keys) =>
                  table.columnPrefs.setOrderedKeys([...keys])
                }
                onReset={() => table.columnPrefs.resetToDefault()}
                disabled={table.loading}
              />
            </Space>
          }
        />

        <SmartTable<EnrollTableRow>
          bizKey="activityApply.list"
          enableColumnResize
          sticky
          columns={table.columns}
          dataSource={table.dataSource}
          rowKey="id"
          total={table.total}
          loading={table.loading}
          error={table.error}
          query={table.query}
          onQueryChange={table.onQueryChange}
          onFiltersChange={table.onFiltersChange}
        />
      </Card>

      <ApplyResultModal
        open={applyFlow.modal.open}
        kind={resultKind as any}
        message={applyFlow.modal.msg}
        onClose={applyFlow.closeModal}
        onCandidate={
          applyFlow.modal.canCandidate
            ? async () => {
                await applyFlow.startCandidateFromFailModal();
              }
            : undefined
        }
        candidating={applyFlow.modal.candidateLoading}
      />

      <Modal
        open={detail.visible}
        title="活动/讲座详情"
        onCancel={detail.closeDetail}
        width={860}
        footer={
          <Space>
            <Button onClick={detail.closeDetail}>关闭</Button>
            <Button
              onClick={() => void detail.reloadDetail()}
              loading={detail.loading}
            >
              刷新详情
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Spin spinning={detail.loading}>
          {detail.detail ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(detail.detail, null, 2)}
            </pre>
          ) : (
            <Text type="secondary">暂无详情数据</Text>
          )}
        </Spin>
      </Modal>

      <SupplementApplyModal
        open={supplement.visible}
        onCancel={supplement.closeSupplement}
        onSubmit={async () => {
          supplement.closeSupplement();
        }}
      />
    </Space>
  );
}
