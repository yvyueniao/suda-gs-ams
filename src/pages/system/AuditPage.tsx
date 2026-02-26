// src/pages/system/AuditPage.tsx

import { useMemo } from "react";
import { Button, Card, Space, Typography } from "antd";

import {
  TableToolbar,
  SmartTable,
  ColumnSettings,
} from "../../shared/components/table";

import { useSystemLogsTable } from "../../features/system/hooks/useSystemLogsTable";
import { buildSystemLogColumns } from "../../features/system/table/columns";
import { systemLogColumnPresets } from "../../features/system/table/presets";

const { Title } = Typography;

export default function AuditPage() {
  const t = useSystemLogsTable();

  const columns = useMemo(() => {
    const base = buildSystemLogColumns({
      sorter: t.query.sorter as any,
    });
    return t.applyPresetsToAntdColumns(base);
  }, [t.query.sorter, t.applyPresetsToAntdColumns]);

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
              系统日志
            </Title>
          </Space>
        </Space>
      }
    >
      <TableToolbar
        left={
          <Space direction="vertical" size={0}>
            <Title level={5} style={{ margin: 0 }}>
              日志列表
            </Title>
          </Space>
        }
        showSearch
        searchMode="change"
        debounceMs={300}
        searchPlaceholder="搜索用户名/姓名/路径/IP/归属地/请求内容"
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
              presets={systemLogColumnPresets}
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
        bizKey="system.logs"
        enableColumnResize
        sticky
        scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
        columns={columns}
        dataSource={t.rows}
        rowKey={(row) => `${row.time}-${row.username}-${row.path}`}
        query={t.query}
        total={t.total}
        loading={t.loading}
        error={t.error}
        onQueryChange={t.onQueryChange}
      />
    </Card>
  );
}
