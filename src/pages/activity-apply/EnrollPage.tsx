// src/pages/activity-apply/EnrollPage.tsx

import { Button, Card, Modal, Space, Spin, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../shared/components/table";
import { useEnrollPage } from "../../features/activity-apply/hooks/useEnrollPage";
import type { EnrollTableRow } from "../../features/activity-apply/types";

import { activityApplyTablePresets } from "../../features/activity-apply/table/presets";
import SupplementApplyModal from "./SupplementApplyModal";

const { Title, Text } = Typography;

export default function EnrollPage() {
  const navigate = useNavigate();
  const { table, detail, supplement } = useEnrollPage();

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Title level={3} style={{ margin: 0 }}>
            活动/讲座报名
          </Title>

          <Space wrap>
            <Button onClick={() => navigate(-1)}>返回</Button>
            <Button onClick={() => table.reload()} loading={table.loading}>
              刷新
            </Button>
            <Button onClick={() => supplement.openSupplement(0)}>补报名</Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <TableToolbar
          keyword={table.query.keyword}
          onKeywordChange={(kw) => table.setKeyword(kw)}
          onRefresh={() => table.reload()}
          loading={table.loading}
          showSearch
          searchMode="change"
          debounceMs={300}
          right={
            <Space>
              <ColumnSettings
                presets={activityApplyTablePresets}
                visibleKeys={table.columnPrefs.visibleKeys}
                onChange={(keys) => table.columnPrefs.setVisibleKeys([...keys])}
                // ✅ 关键：顺序必须走 orderedKeys / setOrderedKeys
                orderedKeys={table.columnPrefs.orderedKeys}
                onOrderChange={(keys) =>
                  table.columnPrefs.setOrderedKeys([...keys])
                }
                onReset={() => table.columnPrefs.resetToDefault()}
                disabled={table.loading}
              />

              <Button
                onClick={() => table.exportCsv()}
                disabled={table.loading}
              >
                导出 CSV
              </Button>
            </Space>
          }
        />

        <SmartTable<EnrollTableRow>
          bizKey="activityApply.list"
          enableColumnResize={true}
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
