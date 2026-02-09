// src/pages/profile/ProfilePage.tsx
import { useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Typography,
  message,
} from "antd";

import {
  ColumnSettings,
  SmartTable,
  TableToolbar,
} from "../../shared/components/table";

import { useProfile } from "../../features/profile/hooks/useProfile";
import type {
  ActivityDetail,
  ModifyPasswordPayload,
  UpdateEmailPayload,
  UserInfo,
} from "../../features/profile/types";
import { ACTIVITY_STATE_LABEL } from "../../features/profile/types";
import {
  activityTypeLabel,
  applicationStateLabel,
  boolLabel,
} from "../../features/profile/table/helpers";

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

function renderUserInfo(user: UserInfo) {
  return (
    <Descriptions
      size="small"
      column={2}
      labelStyle={{ width: 96 }}
      items={[
        { key: "username", label: "学号/工号", children: user.username },
        { key: "name", label: "姓名", children: user.name },
        { key: "role", label: "角色", children: roleLabel(user.role) },
        { key: "department", label: "部门", children: user.department ?? "-" },
        { key: "major", label: "专业", children: user.major },
        { key: "grade", label: "年级", children: user.grade },
        { key: "email", label: "邮箱", children: user.email },
        {
          key: "serviceScore",
          label: "社会服务分",
          children: user.serviceScore,
        },
        { key: "lectureNum", label: "学术讲座次数", children: user.lectureNum },
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

function renderActivityDetail(detail: ActivityDetail) {
  return (
    <Descriptions
      size="small"
      column={2}
      labelStyle={{ width: 96 }}
      items={[
        { key: "name", label: "名称", children: detail.name },
        {
          key: "type",
          label: "类型",
          children: activityTypeLabel(detail.type),
        },
        {
          key: "state",
          label: "状态",
          children: ACTIVITY_STATE_LABEL[detail.state] ?? "-",
        },
        { key: "department", label: "部门", children: detail.department },
        { key: "location", label: "地点", children: detail.location },
        { key: "score", label: "分数", children: detail.score },
        { key: "fullNum", label: "容量", children: detail.fullNum },
        {
          key: "registeredNum",
          label: "已报名",
          children: detail.registeredNum,
        },
        { key: "candidateNum", label: "候补中", children: detail.candidateNum },
        {
          key: "candidateSuccNum",
          label: "候补成功",
          children: detail.candidateSuccNum,
        },
        {
          key: "candidateFailNum",
          label: "候补失败",
          children: detail.candidateFailNum,
        },
        { key: "time", label: "创建时间", children: detail.time },
        {
          key: "signStartTime",
          label: "报名开始",
          children: detail.signStartTime,
        },
        { key: "signEndTime", label: "报名截止", children: detail.signEndTime },
        {
          key: "activityStime",
          label: "开始时间",
          children: detail.activityStime,
        },
        {
          key: "activityEtime",
          label: "结束时间",
          children: detail.activityEtime,
        },
        {
          key: "description",
          label: "描述",
          children: (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {detail.description || "-"}
            </div>
          ),
        },
      ]}
    />
  );
}

export default function ProfilePage() {
  const p = useProfile();
  const t = p.myActivitiesTable;

  // 修改邮箱/密码弹窗
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [emailForm] = Form.useForm<UpdateEmailPayload>();
  const [pwdForm] = Form.useForm<ModifyPasswordPayload>();

  const openEmailModal = () => {
    emailForm.setFieldsValue({ email: p.profile?.email ?? "" });
    setEmailOpen(true);
  };

  const openPwdModal = () => {
    pwdForm.resetFields();
    setPwdOpen(true);
  };

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Card
          title={
            <Title level={4} style={{ margin: 0 }}>
              个人中心
            </Title>
          }
          extra={
            <Space>
              <Button onClick={openEmailModal}>修改邮箱</Button>
              <Button onClick={openPwdModal}>修改密码</Button>
              <Button
                onClick={() => void p.reloadProfile()}
                loading={p.loadingProfile}
              >
                刷新
              </Button>
            </Space>
          }
        >
          {p.loadingProfile ? (
            <Spin />
          ) : p.profile ? (
            renderUserInfo(p.profile)
          ) : (
            <Empty description={p.profileErrorMessage || "暂无用户信息"} />
          )}
        </Card>

        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              我的活动/讲座
            </Title>
          }
          bodyStyle={{ paddingTop: 12 }}
        >
          <TableToolbar
            left={<Text strong>报名记录</Text>}
            showSearch
            searchMode="submit"
            keyword={t.query.keyword}
            onSearch={(kw) => t.setKeyword(kw)} // ✅ 只有回车/点搜索按钮才触发
            onReset={t.reset}
            onRefresh={t.reload}
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

          <Divider style={{ margin: "12px 0" }} />

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

      {/* 修改邮箱 */}
      <Modal
        title="修改邮箱"
        open={emailOpen}
        onCancel={() => {
          setEmailOpen(false);
          emailForm.resetFields();
        }}
        onOk={async () => {
          let values: UpdateEmailPayload;
          try {
            values = await emailForm.validateFields();
          } catch {
            return;
          }

          try {
            const msgText = await p.submitUpdateEmail(values);
            message.success(msgText || "修改成功");
            setEmailOpen(false);
            emailForm.resetFields();
          } catch (e: any) {
            message.error(e?.message || p.submitErrorMessage || "修改失败");
          }
        }}
        confirmLoading={p.submittingEmail}
        destroyOnClose
      >
        <Form form={emailForm} layout="vertical">
          <Form.Item
            name="email"
            label="新邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input placeholder="example@suda.edu.cn" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码 */}
      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => {
          setPwdOpen(false);
          pwdForm.resetFields();
        }}
        onOk={async () => {
          let values: ModifyPasswordPayload;
          try {
            values = await pwdForm.validateFields();
          } catch {
            return;
          }

          try {
            const msgText = await p.submitModifyPassword(values);
            message.success(msgText || "修改成功");
            setPwdOpen(false);
            pwdForm.resetFields();
          } catch (e: any) {
            message.error(e?.message || p.submitErrorMessage || "修改失败");
          }
        }}
        confirmLoading={p.submittingPassword}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: "请输入旧密码" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword1"
            label="新密码"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword2"
            label="确认新密码"
            dependencies={["newPassword1"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const p1 = getFieldValue("newPassword1");
                  if (!value || value === p1) return Promise.resolve();
                  return Promise.reject(new Error("两次输入的新密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* 活动详情 */}
      <Modal
        title="活动详情"
        open={t.detailOpen}
        onCancel={t.closeDetail}
        footer={null}
        destroyOnClose
      >
        {t.detailLoading ? (
          <Spin />
        ) : !t.detail ? (
          <Empty description="未找到活动详情" />
        ) : (
          <div>
            {renderActivityDetail(t.detail)}
            <Divider />
            <Space wrap>
              <Text type="secondary">（报名记录字段）</Text>
              <Text type="secondary">
                报名状态：{applicationStateLabel(t.currentRow?.state)}
              </Text>
              <Text type="secondary">
                签到：{boolLabel(t.currentRow?.checkIn)}
              </Text>
              <Text type="secondary">
                签退：{boolLabel(t.currentRow?.checkOut)}
              </Text>
              <Text type="secondary">
                可加分：{boolLabel(t.currentRow?.getScore)}
              </Text>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
