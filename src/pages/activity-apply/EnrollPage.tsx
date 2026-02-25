// src/pages/activity-apply/EnrollPage.tsx
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
import ApplyResultModal from "./ApplyResultModal";
import SupplementApplyModal from "./SupplementApplyModal";

const { Title } = Typography;

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
    <Card
      title={
        <Space
          style={{ width: "100%", justifyContent: "space-between" }}
          align="center"
        >
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
              活动/讲座报名
            </Title>
          </Space>

          <Button
            type="primary"
            size="middle"
            onClick={() => supplement.openSupplement()}
          >
            补报名
          </Button>
        </Space>
      }
    >
      <TableToolbar
        keyword={table.query.keyword}
        onKeywordChange={(kw) => table.setKeyword(kw)}
        loading={table.loading}
        showSearch
        searchMode="change"
        debounceMs={300}
        left={
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              活动 / 讲座列表
            </Title>
          </Space>
        }
        right={
          <Space>
            <Button onClick={() => table.resetQuery()} disabled={table.loading}>
              重置
            </Button>

            <Button onClick={() => table.exportCsv()} disabled={table.loading}>
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
        scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
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
      {/* 报名结果弹窗 */}
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

      {/* 补报名弹窗 */}
      <SupplementApplyModal
        open={supplement.modal.open}
        submitting={supplement.submitting}
        activityId={supplement.form.activityId}
        activityName={supplement.form.activityName}
        suggestions={supplement.suggestions}
        searching={supplement.searching}
        onClose={supplement.closeSupplement}
        onSearchName={supplement.searchByName}
        onPickSuggestion={supplement.pickActivity}
        onChangeName={supplement.setActivityName}
        onChangeFileList={supplement.setFileList}
        onSubmit={supplement.submit}
      />
    </Card>
  );
}
