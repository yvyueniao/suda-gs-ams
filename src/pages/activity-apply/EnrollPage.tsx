import { useCallback } from "react";
import { Button, Card, Space, Typography, message } from "antd";
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
  const onNotify = useCallback(
    ({ kind, msg }: { kind: "success" | "error" | "info"; msg: string }) => {
      if (kind === "success") message.success(msg);
      else if (kind === "error") message.error(msg);
      else message.info(msg);
    },
    [],
  );

  const { table, supplement, applyFlow } = useEnrollPage({
    onNotify,
  });

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

      {/* 报名结果弹窗（保留：这是报名结果，不是详情） */}
      <ApplyResultModal
        open={applyFlow.modal.open}
        kind={
          applyFlow.modal.kind === "REGISTER_OK"
            ? "REGISTER_SUCCESS"
            : "REGISTER_FAIL"
        }
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

      <SupplementApplyModal
        open={supplement.visible}
        onCancel={supplement.closeSupplement}
        onSubmit={async () => {
          // 当前补报名未接后端：先仅关闭
          supplement.closeSupplement();
        }}
      />
    </Space>
  );
}
