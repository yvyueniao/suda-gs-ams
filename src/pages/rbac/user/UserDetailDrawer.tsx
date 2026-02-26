// src/pages/rbac/user/UserDetailDrawer.tsx

/**
 * UserDetailDrawer
 *
 * ✅ 页面层 UI 组件
 * - 上半部分：用户基本信息（Descriptions）
 * - 下半部分：SmartTable 活动/讲座报名列表（仅渲染，不请求数据）
 */

import {
  Drawer,
  Descriptions,
  Spin,
  Empty,
  Typography,
  Tag,
  Space,
  Divider,
  Button,
} from "antd";

import type { FilterValue } from "antd/es/table/interface";

import {
  SmartTable,
  TableToolbar,
  ColumnSettings,
} from "../../../shared/components/table";

import type { UserInfo, Role } from "../../../features/rbac/user/types";
import { ROLE_LABEL } from "../../../features/rbac/user/types";

// ✅ 行类型唯一真相源：后端 /activity/usernameApplications 返回的 item
import type { UsernameApplicationItem } from "../../../features/rbac/user/types";

const { Title } = Typography;

export type UserDetailDrawerProps = {
  open: boolean;
  onClose: () => void;

  // 用户基本信息
  loading?: boolean;
  detail?: UserInfo | null;

  /** 可选：标注“详情来源接口” */
  sourceApi?: string;

  /** ✅ Drawer 宽度可控（默认更宽一点） */
  width?: number;

  /**
   * ✅ 活动列表（SmartTable）
   * - 仅渲染：数据/columns/query 等全部由父层 hook 提供
   */
  appsTable?: {
    rows: UsernameApplicationItem[];
    total: number;

    loading?: boolean;
    error?: unknown;

    query: any; // TableQuery<UserAppsFilters>
    onQueryChange: (next: any) => void;

    // ✅ 修复：与 TableToolbar 对齐（参数可选）
    setKeyword?: (keyword?: string) => void;

    reload?: () => void;
    reset?: () => void;

    exporting?: boolean;
    exportCsv?: (opts?: any) => void;

    columns: any; // ColumnsType<UsernameApplicationItem>
    presets: any; // TableColumnPreset[]
    columnPrefs: {
      visibleKeys: string[];
      setVisibleKeys: (keys: string[]) => void;
      resetToDefault: () => void;
      orderedKeys?: string[];
      setOrderedKeys?: (keys: string[]) => void;
    };
  };
};

function roleText(role?: Role | number) {
  if (role === undefined || role === null) return "-";
  const r = Number(role) as Role;
  return ROLE_LABEL[r] ?? String(role);
}

export default function UserDetailDrawer(props: UserDetailDrawerProps) {
  const { open, onClose, loading, detail, width = 980, appsTable } = props;

  // ✅ 口径：invalid=true => 正常；invalid=false => 封锁
  const renderStatus = (invalid: boolean) =>
    invalid ? <Tag color="green">正常</Tag> : <Tag color="red">封锁</Tag>;

  return (
    <Drawer
      title="用户详情"
      open={open}
      onClose={onClose}
      width={width}
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : !detail ? (
        <Empty description="暂无数据" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {/* =========================
              1) 基本信息
             ========================= */}
          <Descriptions
            size="small"
            bordered
            column={2}
            labelStyle={{ width: 110 }}
            items={[
              { key: "id", label: "ID", children: detail.id ?? "-" },
              {
                key: "username",
                label: "学号",
                children: detail.username ?? "-",
              },

              { key: "name", label: "姓名", children: detail.name ?? "-" },
              { key: "role", label: "角色", children: roleText(detail.role) },

              {
                key: "status",
                label: "账号状态",
                children: renderStatus(!!detail.invalid),
              },
              {
                key: "department",
                label: "部门",
                children: detail.department ?? "-",
              },

              { key: "email", label: "邮箱", children: detail.email ?? "-" },
              { key: "major", label: "专业", children: detail.major ?? "-" },

              { key: "grade", label: "年级", children: detail.grade ?? "-" },
              {
                key: "serviceScore",
                label: "社会服务分",
                children:
                  typeof detail.serviceScore === "number"
                    ? detail.serviceScore
                    : "-",
              },
              {
                key: "lectureNum",
                label: "讲座次数",
                children:
                  typeof detail.lectureNum === "number"
                    ? detail.lectureNum
                    : "-",
              },

              {
                key: "createTime",
                label: "创建时间",
                children: detail.createTime ?? "-",
              },
              {
                key: "lastLoginTime",
                label: "上次登录",
                children: detail.lastLoginTime ?? "-",
              },
            ]}
          />

          {/* =========================
              2) 活动/讲座报名列表
             ========================= */}
          <Divider style={{ margin: "4px 0 8px" }} />

          <Space
            style={{ width: "100%", justifyContent: "space-between" }}
            align="baseline"
          >
            <Title level={5} style={{ margin: 0 }}>
              活动/讲座报名记录
            </Title>
          </Space>

          {!appsTable ? (
            <Empty description="暂无活动列表" />
          ) : (
            <>
              <TableToolbar
                left={
                  <Space>
                    <Title level={5} style={{ margin: 0 }}>
                      用户报名活动列表
                    </Title>
                  </Space>
                }
                showSearch
                keyword={appsTable.query?.keyword}
                // ✅ 这里的 kw 可能是 undefined（TableToolbar 允许）
                onKeywordChange={(kw) => appsTable.setKeyword?.(kw ?? "")}
                onRefresh={appsTable.reload}
                onReset={appsTable.reset}
                right={
                  <Space>
                    {/* ✅ 导出按钮：做成“和重置/刷新一致的按钮外观” */}
                    {appsTable.exportCsv ? (
                      <Button
                        type="default"
                        onClick={() =>
                          appsTable.exportCsv?.({
                            filenameBase: "用户详情-报名记录",
                          })
                        }
                        loading={!!appsTable.exporting}
                      >
                        导出
                      </Button>
                    ) : null}

                    <ColumnSettings
                      presets={appsTable.presets}
                      visibleKeys={appsTable.columnPrefs.visibleKeys}
                      onChange={appsTable.columnPrefs.setVisibleKeys}
                      orderedKeys={(appsTable.columnPrefs as any).orderedKeys}
                      onOrderChange={
                        (appsTable.columnPrefs as any).setOrderedKeys
                      }
                      onReset={appsTable.columnPrefs.resetToDefault}
                    />
                  </Space>
                }
              />

              <SmartTable
                bizKey="rbac.user.detail.apps"
                enableColumnResize
                sticky
                rowKey={(r: any) =>
                  `${r.username}-${r.activityId}-${r.time ?? ""}`
                }
                columns={appsTable.columns}
                dataSource={appsTable.rows}
                loading={appsTable.loading}
                error={appsTable.error}
                total={appsTable.total}
                query={appsTable.query}
                onQueryChange={appsTable.onQueryChange}
                onFiltersChange={(
                  filters: Record<string, FilterValue | null>,
                ) => {
                  appsTable.onQueryChange({ filters });
                }}
                scroll={{ x: "max-content", y: "calc(86vh - 260px)" }}
              />
            </>
          )}
        </Space>
      )}
    </Drawer>
  );
}
