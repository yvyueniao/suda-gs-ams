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

import { useMemo, useState } from "react";
import {
  Card,
  Space,
  Button,
  Modal,
  Upload,
  Input,
  Form,
  AutoComplete,
  message,
} from "antd";
import type { FilterValue } from "antd/es/table/interface";
import { InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../../shared/components/table";

import { useRegisterListTable } from "../../../features/activity-admin/applications/hooks/useRegisterListTable";

import { buildRegistersColumns } from "../../../features/activity-admin/applications/table/registers/columns";
import { activityAdminRegistersColumnPresets } from "../../../features/activity-admin/applications/table/registers/presets";
import { batchInsertApplyScore } from "../../../features/rbac/user/api";

export type RegisterListPanelProps = {
  /** 当前详情页活动ID */
  activityId: number;
};

export default function RegisterListPanel(props: RegisterListPanelProps) {
  const { activityId } = props;
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [form] = Form.useForm<{ username?: string; name?: string; score?: number }>();

  const t = useRegisterListTable(activityId);

  const userOptions = useMemo(
    () =>
      t.rows.map((row) => ({
        value: row.username,
        label: `${row.username} - ${row.name}`,
        username: row.username,
        name: row.name,
      })),
    [t.rows],
  );

  const nameOptions = useMemo(
    () =>
      t.rows.map((row) => ({
        value: row.name,
        label: `${row.name} - ${row.username}`,
        username: row.username,
        name: row.name,
      })),
    [t.rows],
  );

  const columns = useMemo(() => {
    const base = buildRegistersColumns();
    return t.applyPresetsToAntdColumns(base);
  }, [t]);

  async function handleUpload(file: File) {
    if (importing) return false;
    if (!/\.(xlsx|xls)$/i.test(file.name ?? "")) {
      message.error("请上传 xls/xlsx 文件");
      return Upload.LIST_IGNORE;
    }
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });
      const scoreList = rows
        .map((r) => ({
          username: String(r.username ?? "").trim(),
          score: Number(String(r.score ?? "").trim()),
        }))
        .filter((x) => /^\d{11}$/.test(x.username) && Number.isFinite(x.score));

      if (scoreList.length === 0) {
        message.info("未解析到可提交数据，请检查表头为 username/score");
        return false;
      }
      await batchInsertApplyScore({ activityId, scoreList });
      message.success(`导入成功，共 ${scoreList.length} 条`);
      setImportOpen(false);
      void t.reload();
    } catch (err) {
      message.error((err as Error)?.message || "导入失败");
    } finally {
      setImporting(false);
    }
    return false;
  }

  async function submitManual() {
    const values = await form.validateFields();
    if ((!values.username || !values.username.trim()) && (!values.name || !values.name.trim())) {
      message.info("学号和姓名至少填写一个");
      return;
    }
    const matched = t.rows.find(
      (x) =>
        (values.username && x.username === values.username.trim()) ||
        (values.name && x.name === values.name.trim()),
    );
    if (!matched) {
      message.error("未匹配到报名人员，请从下拉选择");
      return;
    }
    setManualSubmitting(true);
    try {
      await batchInsertApplyScore({
        activityId,
        scoreList: [{ username: matched.username, score: Number(values.score) }],
      });
      message.success("加分成功");
      setManualOpen(false);
      form.resetFields();
      void t.reload();
    } catch (err) {
      message.error((err as Error)?.message || "加分失败");
    } finally {
      setManualSubmitting(false);
    }
  }

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
            <Button onClick={() => setImportOpen(true)}>批量导入加分</Button>
            <Button onClick={() => setManualOpen(true)}>活动加分</Button>
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
        scroll={{ y: "calc(86.5vh - 56px - 48px - 24px - 120px)" }}
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

      <Modal
        title="批量导入活动加分"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Upload.Dragger
          multiple={false}
          maxCount={1}
          accept=".xls,.xlsx"
          beforeUpload={(file) => handleUpload(file as File)}
          disabled={importing}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">上传后将直接导入当前活动（无需活动ID）</p>
          <p className="ant-upload-hint">模板表头固定：username / score</p>
        </Upload.Dragger>
      </Modal>

      <Modal
        title="活动加分"
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={() => void submitManual()}
        confirmLoading={manualSubmitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="学号" name="username">
            <AutoComplete
              options={userOptions}
              placeholder="可输入或下拉选择学号"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              onSelect={(_, option) => {
                form.setFieldsValue({
                  username: (option as any).username,
                  name: (option as any).name,
                });
              }}
            />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <AutoComplete
              options={nameOptions}
              placeholder="可输入或下拉选择姓名"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              onSelect={(_, option) => {
                form.setFieldsValue({
                  username: (option as any).username,
                  name: (option as any).name,
                });
              }}
            />
          </Form.Item>
          <Form.Item label="加分" name="score" rules={[{ required: true, message: "请输入加分" }]}>
            <Input type="number" placeholder="请输入加分" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
