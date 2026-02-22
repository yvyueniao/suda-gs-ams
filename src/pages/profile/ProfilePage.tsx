// src/pages/profile/ProfilePage.tsx
/**
 * ProfilePage
 *
 * ✅ 文件定位
 * - 个人中心页面（UI 渲染层）
 * - 展示：用户信息卡片 + 我的活动/讲座表格
 * - 触发：改邮箱/改密码弹窗 + 表格查询/导出/列设置 + 活动详情弹窗
 *
 * ✅ 分层约定（你现在的架构是对的）
 * - 数据与动作编排：useProfile / useProfileMyActivitiesTable（features/profile/hooks）
 * - 表格通用能力：SmartTable / TableToolbar / ColumnSettings（shared/components/table）
 * - 异步动作统一：shared/actions（useAsyncAction / useAsyncMapAction）
 * - 弹窗：页面层只“开/关 + 绑定 confirmLoading”，不直接写复杂业务
 *
 * ✅ 本次修改点（让页面更“薄”、更一致）
 * 1) 删除未使用的 import（ActivityDetail、MyActivityItem、ACTIVITY_STATE_LABEL、helpers、Modal、message、renderActivityDetail）
 * 2) 修正 Avatar 静态资源路径：public 下资源用 "/avatar-default.png"（不要写 /public/...）
 * 3) 改邮箱/改密码：用 useAsyncAction 统一 loading + 错误口径 + 成功提示（页面不再 try/catch）
 * 4) TableToolbar：传入 loading，让搜索/刷新/重置禁用口径一致（可选但推荐）
 *
 * ✅ 本次 UI 美化点（不动业务逻辑）
 * - 接入 profile.css：用 className 控制页面容器宽度、头像区、信息区、统计区、表格卡样式
 * - 信息区从“纯 Descriptions”升级为“Header + 统计 + Descriptions”
 * - Descriptions 改为响应式列数，移动端不挤
 */

import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Space,
  Spin,
  Typography,
} from "antd";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../shared/components/table";
import { useAsyncAction } from "../../shared/actions";

import { useProfile } from "../../features/profile/hooks/useProfile";
import type { UserInfo } from "../../features/profile/types";

import UpdateEmailModal from "./UpdateEmailModal";
import ModifyPasswordModal from "./ModifyPasswordModal";
import ActivityDetailModal from "./ActivityDetailModal";

const { Title, Text } = Typography;

function roleLabel(role: number) {
  const map: Record<number, string> = {
    0: "管理员",
    1: "主席",
    2: "部长",
    3: "干事",
    4: "普通学生",
  };
  return map[role] ?? String(role);
}

function renderUserDescriptions(user: UserInfo) {
  return (
    <Descriptions
      size="small"
      column={{ xs: 1, sm: 2, md: 2 }}
      labelStyle={{ width: 120 }}
      items={[
        { key: "username", label: "学号/工号", children: user.username },
        { key: "email", label: "邮箱", children: user.email },
        { key: "department", label: "部门", children: user.department ?? "-" },
        { key: "major", label: "专业", children: user.major },
        { key: "grade", label: "年级", children: user.grade },
        { key: "createTime", label: "创建时间", children: user.createTime },
        {
          key: "lastLoginTime",
          label: "上次登录",
          children: user.lastLoginTime,
        },
      ]}
    />
  );
}

export default function ProfilePage() {
  const p = useProfile();
  const t = p.myActivitiesTable;

  const [emailOpen, setEmailOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  /**
   * ✅ 用 useAsyncAction 把“弹窗提交”统一起来
   * - loading：直接绑定给 Modal confirmLoading
   * - success/error：统一 toast（不再页面 try/catch）
   */
  const updateEmailAction = useAsyncAction({
    successMessage: (msg) => (msg ? String(msg) : "修改成功"),
    errorMessage: "修改失败",
    onSuccess: async () => {
      setEmailOpen(false);
    },
  });

  const modifyPasswordAction = useAsyncAction({
    successMessage: (msg) => (msg ? String(msg) : "修改成功"),
    errorMessage: "修改失败",
    onSuccess: async () => {
      setPwdOpen(false);
    },
  });

  /**
   * ✅ 页面级 busy（可选）
   * - 用途：工具条统一禁用搜索/重置/刷新，避免“正在提交邮箱时还能疯狂刷新表格”等交互冲突
   */
  const pageBusy = useMemo(() => {
    return (
      p.loadingProfile ||
      t.loading ||
      updateEmailAction.loading ||
      modifyPasswordAction.loading
    );
  }, [
    p.loadingProfile,
    t.loading,
    updateEmailAction.loading,
    modifyPasswordAction.loading,
  ]);

  const userName = p.profile?.name ?? "-";
  const userRole = p.profile ? roleLabel(p.profile.role) : "-";

  return (
    <div className="profile-page">
      <div className="profile-container">
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Card
            className="profile-user-card"
            title={
              <Title level={4} style={{ margin: 0 }}>
                个人中心
              </Title>
            }
            extra={
              <Space>
                <Button type="primary" onClick={() => setEmailOpen(true)}>
                  修改邮箱
                </Button>
                <Button onClick={() => setPwdOpen(true)}>修改密码</Button>
              </Space>
            }
          >
            {p.loadingProfile ? (
              <div style={{ padding: 12 }}>
                <Spin />
              </div>
            ) : p.profile ? (
              <div className="profile-user-info">
                <div className="profile-avatar-wrapper">
                  {/* ✅ public 下静态资源：直接用 /xxx.png */}
                  <Avatar
                    className="profile-avatar"
                    size={96}
                    src="/avatar-default.png"
                  />
                </div>

                <div className="profile-user-meta">
                  <Title
                    level={4}
                    className="profile-user-name"
                    style={{ marginTop: 0 }}
                  >
                    {userName}{" "}
                    <Text type="secondary" className="profile-user-role">
                      （{userRole}）
                    </Text>
                  </Title>

                  {/* 统计：更适合“数字展示”，别塞在 Descriptions 里 */}
                  <div className="profile-user-stats">
                    <div className="profile-stat-item">
                      <div className="profile-stat-value">
                        {p.profile.serviceScore ?? 0}
                      </div>
                      <div className="profile-stat-label">社会服务分</div>
                    </div>

                    <div className="profile-stat-item">
                      <div className="profile-stat-value">
                        {p.profile.lectureNum ?? 0}
                      </div>
                      <div className="profile-stat-label">学术讲座次数</div>
                    </div>
                  </div>

                  {renderUserDescriptions(p.profile)}
                </div>
              </div>
            ) : (
              <Empty description={p.profileErrorMessage || "暂无用户信息"} />
            )}
          </Card>

          <Card
            className="profile-activities-card"
            title={
              <Title level={4} style={{ margin: 0 }}>
                我的活动/讲座
              </Title>
            }
            bodyStyle={{ paddingTop: 12 }}
          >
            <TableToolbar
              left={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>
                    报名记录
                  </Title>
                </Space>
              }
              showSearch
              searchMode="submit"
              keyword={t.query.keyword}
              onSearch={(kw) => t.setKeyword(kw)}
              onReset={t.reset}
              onRefresh={t.reload}
              loading={pageBusy}
              right={
                <Space>
                  <Button onClick={t.exportCsv} loading={t.exporting}>
                    导出 CSV
                  </Button>

                  <ColumnSettings
                    presets={t.presets}
                    visibleKeys={t.visibleKeys}
                    onChange={t.setVisibleKeys}
                    orderedKeys={t.orderedKeys}
                    onOrderChange={t.setOrderedKeys}
                    onReset={t.resetColumns}
                  />
                </Space>
              }
            />

            <Divider style={{ margin: "10px 0" }} />

            <SmartTable
              bizKey={t.bizKey}
              enableColumnResize
              sticky
              columns={t.columns}
              dataSource={t.list}
              rowKey="activityId"
              query={t.query}
              total={t.total}
              loading={t.loading}
              error={t.error}
              onQueryChange={t.onQueryChange}
              onFiltersChange={t.onFiltersChange}
            />
          </Card>
        </Space>

        {/* 修改邮箱（✅ 由 useAsyncAction 统一提示/关闭） */}
        <UpdateEmailModal
          open={emailOpen}
          initialEmail={p.profile?.email ?? ""}
          confirmLoading={updateEmailAction.loading}
          onCancel={() => setEmailOpen(false)}
          onSubmit={(payload) =>
            updateEmailAction.run(() => p.submitUpdateEmail(payload))
          }
        />

        {/* 修改密码（✅ 由 useAsyncAction 统一提示/关闭） */}
        <ModifyPasswordModal
          open={pwdOpen}
          confirmLoading={modifyPasswordAction.loading}
          onCancel={() => setPwdOpen(false)}
          onSubmit={(payload) =>
            modifyPasswordAction.run(() => p.submitModifyPassword(payload))
          }
        />

        {/* 活动详情 */}
        <ActivityDetailModal
          open={t.detailOpen}
          loading={t.detailLoading}
          detail={t.detail}
          currentRow={t.currentRow}
          onCancel={t.closeDetail}
        />
      </div>
    </div>
  );
}
