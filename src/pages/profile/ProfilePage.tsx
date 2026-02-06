// src/pages/profile/ProfilePage.tsx
/**
 * ProfilePage（表格版 · 接入：列设置(隐藏列) + 拖拽列宽持久化）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Card, Descriptions, Empty, Spin, Tag } from "antd";
import type { DescriptionsProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";

import type { MyActivityItem, UserInfo } from "../../features/profile/types";
import { getMyActivities, getUserInfo } from "../../features/profile/api";

import {
  TableToolbar,
  SmartTable,
  useTableQuery,
  useTableData,
  useColumnPrefs,
  type TableQuery,
  type TableColumnPreset,
  // ✅ 建议你把 ColumnSettings 也从 table/index 导出（更干净）
  ColumnSettings,
} from "../../shared/components/table";

const AVATAR_URL = "/avatar-default.png";
const TABLE_BIZ_KEY = "profile.myActivities";

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

  /** ================= 列预设（用于列设置/隐藏列） ================= */
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
      { title: "时间", dataIndex: "timeRange", key: "timeRange", width: 180 },
      { title: "地点", dataIndex: "location", key: "location", width: 200 },
      {
        title: "主办方",
        dataIndex: "organizer",
        key: "organizer",
        width: 180,
        render: (v: string) => <span style={{ color: "#666" }}>{v}</span>,
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 110,
        fixed: "right",
        render: (v: string) => <Tag>{statusLabel(v)}</Tag>,
      },
    ],
    [],
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
          onReset={reset}
          right={
            <ColumnSettings<MyActivityItem>
              presets={columnPresets}
              visibleKeys={visibleKeys}
              onChange={setVisibleKeys}
              onReset={resetToDefault}
            />
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
