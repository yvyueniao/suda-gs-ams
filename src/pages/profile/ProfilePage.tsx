// src/pages/profile/ProfilePage.tsx
/**
 * ProfilePage（表格版 · 接入：列设置(隐藏列) + 拖拽列宽持久化 + 导出（全量/跨页/继承筛选搜索））
 * - 时间列：支持排序（前端排序）
 * - 状态列：支持筛选（前端筛选）
 * - ✅ 当前页：批量选择 + 全选（Table 自带能力，受控 selectedRowKeys）
 *
 * ✅ 修复点：
 * - 筛选“点确定没反应”的根因：你把 statusFilter 作为 filteredValue 受控了，
 *   但 SmartTable 之前没有把 Table 的 filters 变化抛出来更新 statusFilter。
 * - 现在通过 SmartTable.onFiltersChange 把 filters.status 同步到 statusFilter。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Spin,
  Tag,
  message,
} from "antd";
import type { DescriptionsProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, UserOutlined } from "@ant-design/icons";
import type { FilterValue } from "antd/es/table/interface";

import type { MyActivityItem, UserInfo } from "../../features/profile/types";
import { getMyActivities, getUserInfo } from "../../features/profile/api";

import {
  TableToolbar,
  SmartTable,
  useTableQuery,
  useTableData,
  useColumnPrefs,
  useTableExport,
  exportCsv,
  type TableQuery,
  type TableColumnPreset,
  ColumnSettings,
} from "../../shared/components/table";

const AVATAR_URL = "/avatar-default.png";
const TABLE_BIZ_KEY = "profile.myActivities";

type StatusKey = "pending" | "signed" | "attended" | "cancelled";
const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "pending", label: "未开始" },
  { value: "signed", label: "已报名" },
  { value: "attended", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

function isStatusKey(x: any): x is StatusKey {
  return STATUS_OPTIONS.some((s) => s.value === x);
}

function readStatusKeysFromFilters(v: FilterValue | null | undefined) {
  if (!v) return null;
  const arr = Array.isArray(v) ? v : [v];
  const next = arr.filter(isStatusKey);
  return next.length ? next : null;
}

// 尽量从 timeRange 里“猜”一个可排序的时间戳（你后端如果有 startTime 字段，建议直接用它）
function parseTimeRangeStartMs(timeRange: string | undefined): number {
  if (!timeRange) return 0;

  const m = String(timeRange).match(
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}[^0-9]?\d{0,2}:?\d{0,2}/,
  );
  if (m?.[0]) {
    const s = m[0].replace(/\//g, "-");
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
  }

  const d = String(timeRange).match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  if (d?.[0]) {
    const t = Date.parse(d[0].replace(/\//g, "-"));
    if (!Number.isNaN(t)) return t;
  }

  return 0;
}

export default function ProfilePage() {
  /** ================= 用户信息（真实接口） ================= */
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<unknown>(null);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const u = await getUserInfo();
      setUser(u);
    } catch (e) {
      setUserError(e);
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  /** ================= 我的活动/讲座列表（通用表格） ================= */
  const { query, setPage, setKeyword, reset } = useTableQuery({
    initial: { page: 1, pageSize: 10, keyword: "" },
  });

  // ✅ fetcher 必须 useCallback，保证引用稳定（导出也复用它）
  const fetchMyActivities = useCallback(async (q: TableQuery<any>) => {
    return getMyActivities({
      page: q.page,
      pageSize: q.pageSize,
      keyword: q.keyword,
    });
  }, []);

  const {
    list: activities,
    total,
    loading: listLoading,
    error: listError,
    reload,
  } = useTableData<MyActivityItem>(query, fetchMyActivities);

  /** ================= 列预设（用于列设置/隐藏列/导出列） ================= */
  const columnPresets: TableColumnPreset<MyActivityItem>[] = useMemo(
    () => [
      { key: "title", title: "标题", exportName: "title" },
      { key: "timeRange", title: "时间", width: 180, exportName: "timeRange" },
      { key: "location", title: "地点", width: 200, exportName: "location" },
      {
        key: "organizer",
        title: "主办方",
        width: 180,
        exportName: "organizer",
      },
      { key: "status", title: "状态", width: 110, exportName: "status" },
    ],
    [],
  );

  const {
    visibleKeys,
    setVisibleKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<MyActivityItem>(TABLE_BIZ_KEY, columnPresets);

  /** ================= 状态筛选（受控 filters） ================= */
  const [statusFilter, setStatusFilter] = useState<StatusKey[] | null>(null);

  /** ================= ✅ 当前页选择（批量选择 + 全选） ================= */
  // 说明：这里我们只做“当前页”的勾选，翻页就清空，避免误以为跨页都选中了。
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 翻页/改页大小/搜索/筛选变化时，清空选择（当前页选择的合理默认行为）
  useEffect(() => {
    setSelectedRowKeys([]);
  }, [query.page, query.pageSize, query.keyword, statusFilter]);

  const rowSelection = useMemo(() => {
    return {
      selectedRowKeys,
      onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: false, // 当前页即可
    };
  }, [selectedRowKeys]);

  /** ================= 导出（前端跨页拉全量 + CSV 下载） ================= */
  const { exportAll, exporting } = useTableExport<MyActivityItem>(
    query,
    fetchMyActivities,
    {
      pageSize: 500,
      maxRows: 20000,
    },
  );

  const applyStatusFilterToRows = useCallback(
    (rows: MyActivityItem[]) => {
      if (!statusFilter || statusFilter.length === 0) return rows;
      const set = new Set(statusFilter);
      return rows.filter((r) => set.has(r.status as any));
    },
    [statusFilter],
  );

  const handleExport = useCallback(async () => {
    try {
      const rowsAll = await exportAll();
      const rows = applyStatusFilterToRows(rowsAll);

      exportCsv({
        filename: "我的活动.csv",
        rows,
        presets: columnPresets,
        visibleKeys,
        mapRow: (row) => ({
          ...row,
          status: statusLabel(row.status),
        }),
      });

      message.success(`已导出 ${rows.length} 条`);
    } catch {
      message.error("导出失败，请稍后重试");
    }
  }, [applyStatusFilterToRows, columnPresets, exportAll, visibleKeys]);

  /** ================= antd columns（真正渲染用） ================= */
  const rawColumns: ColumnsType<MyActivityItem> = useMemo(
    () => [
      {
        title: "标题",
        dataIndex: "title",
        key: "title",
        render: (v: string, record) => (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{v}</span>
            <Tag color={record.category === "lecture" ? "blue" : "green"}>
              {record.category === "lecture" ? "讲座" : "活动"}
            </Tag>
          </div>
        ),
      },

      // ✅ 时间列：支持排序（前端排序）
      {
        title: "时间",
        dataIndex: "timeRange",
        key: "timeRange",
        width: 180,
        sorter: (a, b) =>
          parseTimeRangeStartMs(a.timeRange) -
          parseTimeRangeStartMs(b.timeRange),
        sortDirections: ["ascend", "descend"],
      },

      { title: "地点", dataIndex: "location", key: "location", width: 200 },

      {
        title: "主办方",
        dataIndex: "organizer",
        key: "organizer",
        width: 180,
        render: (v: string) => <span style={{ color: "#666" }}>{v}</span>,
      },

      // ✅ 状态列：支持筛选（受控 + 前端过滤）
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 110,
        fixed: "right",
        filters: STATUS_OPTIONS.map((x) => ({ text: x.label, value: x.value })),
        filteredValue: statusFilter ?? null,
        onFilter: (value, record) => record.status === value,
        render: (v: string) => <Tag>{statusLabel(v)}</Tag>,
      },
    ],
    [statusFilter],
  );

  const columns = useMemo(
    () => applyPresetsToAntdColumns(rawColumns),
    [applyPresetsToAntdColumns, rawColumns],
  );

  /** ============== 描述信息（基础信息卡） ============== */
  const infoItems: DescriptionsProps["items"] = useMemo(() => {
    if (!user) return [];
    return [
      { label: "姓名", children: user.name },
      { label: "学号", children: user.username },
      { label: "邮箱", children: user.email },
      { label: "专业", children: user.major },
      { label: "年级", children: user.grade },
      { label: "部门", children: user.department ?? "—" },
      { label: "创建时间", children: user.createTime },
      { label: "上次登录", children: user.lastLoginTime },
    ];
  }, [user]);

  const serviceScore = user?.serviceScore ?? 0;
  const lectureCount = user?.lectureNum ?? 0;

  if (userLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div style={{ padding: 24 }}>
        <Empty
          description={userError ? "加载用户信息失败" : "未获取到用户信息"}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 12, maxWidth: 1800, margin: "0 auto" }}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Avatar size={96} src={AVATAR_URL} icon={<UserOutlined />} />
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 8 }}>{user.name}</h2>
            <div style={{ color: "#888" }}>
              {user.major} · {user.grade}
            </div>
          </div>
        </div>

        <Descriptions style={{ marginTop: 24 }} column={2} items={infoItems} />
      </Card>

      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#888" }}>社会服务分</div>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{serviceScore}</div>
        </Card>

        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#888" }}>学术讲座次数</div>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{lectureCount}</div>
        </Card>
      </div>

      <Card title="我的活动 / 讲座">
        <TableToolbar
          showSearch
          keyword={query.keyword}
          onKeywordChange={(kw) => setKeyword(kw ?? "")}
          onRefresh={reload}
          onReset={() => {
            reset();
            setStatusFilter(null);
            setSelectedRowKeys([]); // ✅ 重置时也清空选择
          }}
          // ✅ 展示“已选 X 条 + 清空”
          selectedCount={selectedRowKeys.length}
          onClearSelection={() => setSelectedRowKeys([])}
          right={
            <>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
              >
                导出
              </Button>

              <ColumnSettings<MyActivityItem>
                presets={columnPresets}
                visibleKeys={visibleKeys}
                onChange={setVisibleKeys}
                onReset={resetToDefault}
              />
            </>
          }
        />

        <SmartTable<MyActivityItem>
          bizKey={TABLE_BIZ_KEY}
          enableColumnResize
          minColumnWidth={80}
          columns={columns}
          dataSource={activities}
          rowKey="id"
          query={query}
          total={total}
          loading={listLoading}
          error={listError}
          emptyText="暂无报名记录"
          rowSelection={rowSelection} // ✅ 当前页批量选择/全选（Table 自带全选）
          onQueryChange={(next) => {
            const nextPage =
              typeof next.page === "number" ? next.page : query.page;
            const nextPageSize =
              typeof next.pageSize === "number"
                ? next.pageSize
                : query.pageSize;

            if (nextPage === query.page && nextPageSize === query.pageSize)
              return;
            setPage(nextPage, nextPageSize);
            setSelectedRowKeys([]); // ✅ 翻页时清空（当前页选择）
          }}
          // ✅ 关键：同步筛选值（让 filteredValue 真正更新，从而触发筛选）
          onFiltersChange={(filters) => {
            const next = readStatusKeysFromFilters(filters?.status);
            setStatusFilter(next);
            setSelectedRowKeys([]); // ✅ 筛选变化清空选择

            // ✅ 体验更好：筛选后回到第一页（可选，但建议）
            if (next) setPage(1, query.pageSize);
          }}
        />
      </Card>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "未开始";
    case "signed":
      return "已报名";
    case "attended":
      return "已完成";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
}
