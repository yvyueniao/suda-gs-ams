// src/pages/rbac/user/UserDetailDrawer.tsx

/**
 * UserDetailDrawer
 *
 * ✅ 页面层 UI 组件
 * - 只负责展示 Drawer + Descriptions
 * - 不请求数据：detail 由父层（useUserManagePage/useUserRowActions）传入
 *
 * ✅ 修复点：
 * - invalid 口径修正：true = 正常，false = 封锁
 * - 提示文案不再写死 /user/info（你说不用它了）
 */

import React from "react";
import {
  Drawer,
  Descriptions,
  Spin,
  Empty,
  Typography,
  Tag,
  Space,
} from "antd";

import type { UserInfo, Role } from "../../../features/rbac/user/types";
import { ROLE_LABEL } from "../../../features/rbac/user/types";

const { Text } = Typography;

export type UserDetailDrawerProps = {
  open: boolean;
  onClose: () => void;

  loading?: boolean;
  detail?: UserInfo | null;

  /**
   * ✅ 可选：标注“详情来源接口”
   * 例如："/user/pages"、"/department/allMembers" 等
   * 不传则不展示来源提示
   */
  sourceApi?: string;
};

function roleText(role?: Role | number) {
  if (role === undefined || role === null) return "-";
  const r = Number(role) as Role;
  return ROLE_LABEL[r] ?? String(role);
}

export default function UserDetailDrawer(props: UserDetailDrawerProps) {
  const { open, onClose, loading, detail, sourceApi } = props;

  // ✅ 口径：invalid=true => 正常；invalid=false => 封锁
  const renderStatus = (invalid: boolean) =>
    invalid ? <Tag color="green">正常</Tag> : <Tag color="red">封锁</Tag>;

  return (
    <Drawer
      title="用户详情"
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : !detail ? (
        <Empty description="暂无数据" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
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

          {sourceApi ? (
            <Text type="secondary">
              提示：详情数据来源 <Text code>{sourceApi}</Text>（本页面不再调用
              /user/info）。
            </Text>
          ) : null}
        </Space>
      )}
    </Drawer>
  );
}
