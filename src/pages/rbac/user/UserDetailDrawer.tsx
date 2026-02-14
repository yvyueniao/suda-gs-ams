// src/pages/rbac/user/UserDetailDrawer.tsx

/**
 * UserDetailDrawer
 *
 * ✅ 页面层 UI 组件
 * - 只负责展示 Drawer + Descriptions
 * - 不请求数据：detail 由父层（useUserManagePage/useUserRowActions）传入
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
};

function roleText(role?: Role | number) {
  if (role === undefined || role === null) return "-";
  // 兼容后端可能给 number
  const r = Number(role) as Role;
  return ROLE_LABEL[r] ?? String(role);
}

export default function UserDetailDrawer(props: UserDetailDrawerProps) {
  const { open, onClose, loading, detail } = props;

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
              {
                key: "role",
                label: "角色",
                children: roleText(detail.role),
              },

              {
                key: "status",
                label: "账号状态",
                children: detail.invalid ? (
                  <Tag color="red">封锁</Tag>
                ) : (
                  <Tag color="green">正常</Tag>
                ),
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

          <Text type="secondary">
            提示：详情数据来自 <Text code>/user/info</Text>，用于展示完整信息。
          </Text>
        </Space>
      )}
    </Drawer>
  );
}
