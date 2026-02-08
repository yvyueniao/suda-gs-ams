// src/pages/profile/ProfilePage.tsx
/**
 * ProfilePage（通用表格框架版 · 最新版）
 *
 * ✅ 适配你们当前后端特点：
 * - 后端只返回全量：分页/筛选/搜索/排序全部在前端完成
 * - 因此：不使用 useTableExport（它面向“后端分页接口”），导出直接基于“筛选后的全量”
 *
 * ✅ 表格框架接入点：
 * - useTableQuery：统一 query（page/pageSize/keyword/sorter）
 * - useTableData：请求态组织（loading/error/list/total/reload）
 * - SmartTable：受控分页 + sorter 透出 + filtersChange 透出 + 列宽拖拽
 * - useColumnPrefs + ColumnSettings：列显示偏好 + 持久化
 * - exportCsv：导出（BOM/转义/按 visibleKeys）
 * - ActionCell：操作列（更多/confirm/danger）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import type { DescriptionsProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FilterValue } from "antd/es/table/interface";
import {
  DownloadOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";

import type {
  ActivityType,
  ApplicationState,
  MyActivityItem,
  ProfileActivityDetail,
  UserInfo,
} from "../../features/profile/types";
import {
  getActivityDetailById,
  getMyActivities,
  getUserInfo,
} from "../../features/profile/api";
import { setToken } from "../../shared/session/token";

import {
  TableToolbar,
  SmartTable,
  useTableQuery,
  useTableData,
  useColumnPrefs,
  exportCsv,
  ColumnSettings,
  ActionCell,
  type TableQuery,
  type TableColumnPreset,
  type TableSorter,
} from "../../shared/components/table";

const AVATAR_URL = "/avatar-default.png";
const TABLE_BIZ_KEY = "profile.myActivities";

/** ======= label helpers ======= */
function typeLabel(t: ActivityType) {
  return t === 0 ? "活动" : "讲座";
}

function appStateLabel(s: ApplicationState) {
  const map: Record<ApplicationState, string> = {
    0: "报名成功",
    1: "候补中",
    2: "候补成功",
    3: "候补失败",
  };
  return map[s];
}

function appStateTagColor(s: ApplicationState) {
  const map: Record<ApplicationState, string> = {
    0: "green",
    1: "gold",
    2: "blue",
    3: "red",
  };
  return map[s];
}

function boolLabel(v: boolean, yes = "是", no = "否") {
  return v ? yes : no;
}

function parseTimeMs(timeStr: string | undefined) {
  if (!timeStr) return 0;
  const iso = String(timeStr).replace(" ", "T");
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** ======= filters options ======= */
const APP_STATE_OPTIONS: { value: ApplicationState; label: string }[] = [
  { value: 0, label: "报名成功" },
  { value: 1, label: "候补中" },
  { value: 2, label: "候补成功" },
  { value: 3, label: "候补失败" },
];

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 0, label: "活动" },
  { value: 1, label: "讲座" },
];

function readNumberKeysFromFilters(
  v: FilterValue | null | undefined,
  allowed: number[],
) {
  if (!v) return null;
  const arr = Array.isArray(v) ? v : [v];
  const set = new Set(allowed);
  const next = arr
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && set.has(n));
  return next.length ? next : null;
}

/** ======= detail state label ======= */
function activityStateLabel(state: number) {
  const map: Record<number, string> = {
    0: "未开始",
    1: "报名中",
    2: "报名结束",
    3: "进行中",
    4: "已结束",
  };
  return map[state] ?? String(state);
}

/** ======= local sort (front-end) ======= */
function applySorter(rows: MyActivityItem[], sorter?: TableSorter) {
  if (!sorter?.field || !sorter.order) return rows;

  const field = sorter.field;
  const dir = sorter.order === "ascend" ? 1 : -1;

  const next = [...rows].sort((a: any, b: any) => {
    const av = a?.[field];
    const bv = b?.[field];

    // time 字段特殊处理（你们是字符串时间）
    if (field === "time") {
      const at = parseTimeMs(String(av ?? ""));
      const bt = parseTimeMs(String(bv ?? ""));
      return (at - bt) * dir;
    }

    // number
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * dir;
    }

    // boolean
    if (typeof av === "boolean" && typeof bv === "boolean") {
      return (Number(av) - Number(bv)) * dir;
    }

    // string fallback
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return as.localeCompare(bs) * dir;
  });

  return next;
}

export default function ProfilePage() {
  /** ================= 用户信息 ================= */
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<unknown>(null);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const data = await getUserInfo(); // { user, token }
      setUser(data.user);
      if (data.token) setToken(data.token);
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

  /** ================= Query ================= */
  const { query, setPage, setKeyword, setSorter, reset } = useTableQuery({
    initial: { page: 1, pageSize: 10, keyword: "" },
  });

  /** ================= Filters：状态/类型（受控） ================= */
  const [stateFilter, setStateFilter] = useState<ApplicationState[] | null>(
    null,
  );
  const [typeFilter, setTypeFilter] = useState<ActivityType[] | null>(null);

  /** ================= 选择（批量选择） ================= */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  useEffect(() => {
    setSelectedRowKeys([]);
  }, [
    query.page,
    query.pageSize,
    query.keyword,
    query.sorter,
    stateFilter,
    typeFilter,
  ]);

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
      preserveSelectedRowKeys: false,
    }),
    [selectedRowKeys],
  );

  /** ================= 前端过滤（keyword + filters） ================= */
  const applyFilters = useCallback(
    (rows: MyActivityItem[], keyword: string) => {
      let next = rows;

      const kw = (keyword ?? "").trim();
      if (kw) {
        next = next.filter((r) => {
          const idHit = String(r.activityId).includes(kw);
          const userHit = String(r.username ?? "").includes(kw);
          return idHit || userHit;
        });
      }

      if (typeFilter?.length) {
        const set = new Set(typeFilter);
        next = next.filter((r) => set.has(r.type));
      }

      if (stateFilter?.length) {
        const set = new Set(stateFilter);
        next = next.filter((r) => set.has(r.state));
      }

      return next;
    },
    [stateFilter, typeFilter],
  );

  /** ================= fetcher：后端全量 → 前端处理 → 返回当前页 ================= */
  const fetchMyActivities = useCallback(
    async (q: TableQuery<any>) => {
      const rowsAll = await getMyActivities(); // MyActivityItem[]
      const base = Array.isArray(rowsAll) ? rowsAll : [];

      // 1) keyword + filters
      const filtered = applyFilters(base, q.keyword ?? "");

      // 2) sorter（基于“筛选后的全量”排序，再分页）
      const sorted = applySorter(filtered, q.sorter);

      // 3) paging
      const total = sorted.length;
      const start = (q.page - 1) * q.pageSize;
      const list = sorted.slice(start, start + q.pageSize);

      return { list, total };
    },
    [applyFilters],
  );

  const {
    list: activities,
    total,
    loading: listLoading,
    error: listError,
    reload: reloadList,
  } = useTableData<MyActivityItem>(query, fetchMyActivities);

  const reloadAll = useCallback(() => {
    void loadUser();
    reloadList();
  }, [loadUser, reloadList]);

  /** ================= 列预设（✅ key 必须和 columns.key 完全一致） ================= */
  const columnPresets: TableColumnPreset<MyActivityItem>[] = useMemo(
    () => [
      {
        key: "activityId",
        title: "活动ID",
        width: 110,
        exportName: "activityId",
      },
      { key: "type", title: "类型", width: 90, exportName: "type" },
      { key: "state", title: "报名状态", width: 120, exportName: "state" },
      { key: "time", title: "申请时间", width: 180, exportName: "time" },
      { key: "checkIn", title: "是否签到", width: 110, exportName: "checkIn" },
      {
        key: "getScore",
        title: "是否加分",
        width: 110,
        exportName: "getScore",
      },
      { key: "score", title: "分数", width: 90, exportName: "score" },
    ],
    [],
  );

  // ✅ 关键改动：接入 orderedKeys / setOrderedKeys
  const {
    visibleKeys,
    setVisibleKeys,
    orderedKeys,
    setOrderedKeys,
    resetToDefault,
    applyPresetsToAntdColumns,
  } = useColumnPrefs<MyActivityItem>(TABLE_BIZ_KEY, columnPresets);

  /** ================= 导出（基于“筛选后的全量”，不走 useTableExport） ================= */
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const rowsAll = await getMyActivities();
      const base = Array.isArray(rowsAll) ? rowsAll : [];

      const filtered = applyFilters(base, query.keyword ?? "");
      const sorted = applySorter(filtered, query.sorter);

      exportCsv({
        filename: "我的报名记录.csv",
        rows: sorted,
        presets: columnPresets,
        visibleKeys,
        mapRow: (row) => ({
          ...row,
          type: typeLabel(row.type) as any,
          state: appStateLabel(row.state) as any,
          checkIn: boolLabel(row.checkIn) as any,
          getScore: boolLabel(row.getScore, "可加分", "不加分") as any,
        }),
      });

      message.success(`已导出 ${sorted.length} 条`);
    } catch {
      message.error("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }, [
    applyFilters,
    columnPresets,
    exporting,
    query.keyword,
    query.sorter,
    visibleKeys,
  ]);

  /** ================= 详情弹窗 ================= */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ProfileActivityDetail | null>(null);

  const openDetail = useCallback(async (row: MyActivityItem) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const resp = await getActivityDetailById(row.activityId);
      setDetail(resp.activity ?? null);
    } catch {
      setDetail(null);
      message.error("获取详情失败");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
  }, []);

  const handleDelete = useCallback(async (row: MyActivityItem) => {
    message.info(`示例：删除报名记录（activityId=${row.activityId}）`);
  }, []);

  /** ================= raw columns（✅ 每列补齐 key；filters 不用 onFilter，避免二次过滤） ================= */
  const rawColumns: ColumnsType<MyActivityItem> = useMemo(
    () => [
      {
        title: "活动ID",
        dataIndex: "activityId",
        key: "activityId",
        width: 110,
      },
      {
        title: "类型",
        dataIndex: "type",
        key: "type",
        width: 90,
        filters: TYPE_OPTIONS.map((x) => ({ text: x.label, value: x.value })),
        filteredValue: typeFilter ?? null,
        render: (v: ActivityType) => <Tag>{typeLabel(v)}</Tag>,
      },
      {
        title: "报名状态",
        dataIndex: "state",
        key: "state",
        width: 120,
        filters: APP_STATE_OPTIONS.map((x) => ({
          text: x.label,
          value: x.value,
        })),
        filteredValue: stateFilter ?? null,
        render: (v: ApplicationState) => (
          <Tag color={appStateTagColor(v)}>{appStateLabel(v)}</Tag>
        ),
      },
      {
        title: "申请时间",
        dataIndex: "time",
        key: "time",
        width: 180,
        sorter: true, // ✅ 交给 query.sorter + fetcher 做“全量排序”
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "是否签到",
        dataIndex: "checkIn",
        key: "checkIn",
        width: 110,
        render: (v: boolean) =>
          v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
      },
      {
        title: "是否加分",
        dataIndex: "getScore",
        key: "getScore",
        width: 110,
        render: (v: boolean) =>
          v ? <Tag color="green">可加分</Tag> : <Tag>不加分</Tag>,
      },
      {
        title: "分数",
        dataIndex: "score",
        key: "score",
        width: 90,
        sorter: true,
        sortDirections: ["ascend", "descend"],
      },
      {
        title: "操作",
        key: "actions",
        width: 200,
        fixed: "right",
        render: (_: unknown, record: MyActivityItem) => (
          <ActionCell
            record={record}
            maxVisible={2}
            actions={[
              {
                key: "detail",
                label: "详情",
                onClick: () => void openDetail(record),
              },
              {
                key: "delete",
                label: "删除",
                danger: true,
                confirm: {
                  title: "确认删除？",
                  description: "（示例）当前接口未提供删除报名记录",
                },
                onClick: () => void handleDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [openDetail, handleDelete, stateFilter, typeFilter],
  );

  const columns = useMemo(
    () => applyPresetsToAntdColumns(rawColumns),
    [applyPresetsToAntdColumns, rawColumns],
  );

  /** ============== 描述信息 ============== */
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
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Button icon={<ReloadOutlined />} onClick={() => void loadUser()}>
            重试
          </Button>
        </div>
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

          <Button icon={<ReloadOutlined />} onClick={reloadAll}>
            刷新
          </Button>
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

      <Card title="我的活动 / 讲座报名记录">
        <TableToolbar
          showSearch
          keyword={query.keyword}
          // ✅ 后端全量：推荐 change 模式 + debounce，本地过滤体验更像真实后台
          searchMode="change"
          debounceMs={300}
          onKeywordChange={(kw) => setKeyword(kw ?? "")}
          onRefresh={reloadList}
          onReset={() => {
            reset();
            setStateFilter(null);
            setTypeFilter(null);
            setSelectedRowKeys([]);
          }}
          selectedCount={selectedRowKeys.length}
          onClearSelection={() => setSelectedRowKeys([])}
          loading={listLoading || exporting}
          right={
            <>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => void handleExport()}
                loading={exporting}
              >
                导出
              </Button>

              {/* ✅ 关键改动：把顺序受控值/回调传进去 */}
              <ColumnSettings<MyActivityItem>
                presets={columnPresets}
                visibleKeys={visibleKeys}
                onChange={setVisibleKeys}
                orderedKeys={orderedKeys}
                onOrderChange={setOrderedKeys}
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
          rowKey="activityId"
          query={query}
          total={total}
          loading={listLoading}
          error={listError}
          emptyText="暂无报名记录"
          rowSelection={rowSelection}
          // ✅ fixed/resize 体验需要横向滚动
          scroll={{ x: 1100 }}
          onQueryChange={(next) => {
            // page/pageSize
            const nextPage =
              typeof next.page === "number" ? next.page : query.page;
            const nextPageSize =
              typeof next.pageSize === "number"
                ? next.pageSize
                : query.pageSize;
            if (nextPage !== query.page || nextPageSize !== query.pageSize) {
              setPage(nextPage, nextPageSize);
              setSelectedRowKeys([]);
            }

            // sorter（全量排序在 fetcher 做）
            if ("sorter" in next) {
              setSorter(next.sorter);
              setSelectedRowKeys([]);
            }
          }}
          onFiltersChange={(filters) => {
            const nextState = readNumberKeysFromFilters(
              filters?.state,
              APP_STATE_OPTIONS.map((x) => x.value),
            ) as ApplicationState[] | null;

            const nextType = readNumberKeysFromFilters(
              filters?.type,
              TYPE_OPTIONS.map((x) => x.value),
            ) as ActivityType[] | null;

            setStateFilter(nextState);
            setTypeFilter(nextType);
            setSelectedRowKeys([]);

            // ✅ 过滤变化回第一页
            setPage(1, query.pageSize);
          }}
        />
      </Card>

      <Modal
        title="活动/讲座详情"
        open={detailOpen}
        onCancel={closeDetail}
        footer={
          <Button type="primary" onClick={closeDetail}>
            关闭
          </Button>
        }
        width={760}
      >
        {detailLoading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : detail ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {typeLabel(detail.type)}
            </Descriptions.Item>

            <Descriptions.Item label="名称" span={2}>
              {detail.name}
            </Descriptions.Item>

            <Descriptions.Item label="部门">
              {detail.department}
            </Descriptions.Item>
            <Descriptions.Item label="地点">
              {detail.location}
            </Descriptions.Item>

            <Descriptions.Item label="报名开始">
              {detail.signStartTime}
            </Descriptions.Item>
            <Descriptions.Item label="报名截止">
              {detail.signEndTime}
            </Descriptions.Item>

            <Descriptions.Item label="开始时间">
              {detail.activityStime}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {detail.activityEtime}
            </Descriptions.Item>

            <Descriptions.Item label="状态">
              {activityStateLabel(detail.state)}
            </Descriptions.Item>
            <Descriptions.Item label="分数">{detail.score}</Descriptions.Item>

            <Descriptions.Item label="已报名人数">
              {detail.registeredNum}
            </Descriptions.Item>
            <Descriptions.Item label="候补人数">
              {detail.candidateNum}
            </Descriptions.Item>

            <Descriptions.Item label="候补成功">
              {detail.candidateSuccNum}
            </Descriptions.Item>
            <Descriptions.Item label="候补失败">
              {detail.candidateFailNum}
            </Descriptions.Item>

            <Descriptions.Item label="简介" span={2}>
              <div style={{ whiteSpace: "pre-wrap" }}>{detail.description}</div>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="未获取到详情" />
        )}
      </Modal>
    </div>
  );
}
