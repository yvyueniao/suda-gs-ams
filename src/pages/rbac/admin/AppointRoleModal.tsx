// src/pages/rbac/admin/AppointRoleModal.tsx
import { useEffect, useMemo } from "react";
import { Modal, Form, Select, Space, Spin, Typography } from "antd";

import type {
  AppointRoleFormValues,
  DepartmentOption,
  Role,
  UserSuggestion,
} from "../../../features/rbac/admin/types";
import { ROLE_LABEL } from "../../../features/rbac/admin/types";

const { Text } = Typography;

export type AppointRoleModalProps = {
  open: boolean;
  onClose: () => void;

  departments: DepartmentOption[];
  loadingDepartments?: boolean;

  suggestions: UserSuggestion[];
  searchingSuggestion?: boolean;

  values?: Partial<AppointRoleFormValues>;

  onSearchUser: (key: string) => void | Promise<unknown>;
  onPickUser: (u: UserSuggestion) => void;
  clearPickedUser: () => void;

  submitting?: boolean;
  onSubmit: (values: AppointRoleFormValues) => void | Promise<unknown>;
};

function roleOptions() {
  const allow: Role[] = [1, 2, 3];
  return allow.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
}

export default function AppointRoleModal(props: AppointRoleModalProps) {
  const {
    open,
    onClose,
    departments,
    loadingDepartments,
    suggestions,
    searchingSuggestion,
    values,
    onSearchUser,
    onPickUser,
    clearPickedUser,
    submitting,
    onSubmit,
  } = props;

  const [form] = Form.useForm<AppointRoleFormValues>();

  /**
   * ✅ 关键修复：两个下拉 options 的 value 都使用 username（唯一）
   * 这样线上同名也不会导致虚拟列表复用错乱
   */
  const nameOptions = useMemo(() => {
    return (suggestions ?? []).map((u) => ({
      value: u.username, // ✅ 唯一
      label: (
        <Space size={8}>
          <Text>{u.name}</Text>
          <Text type="secondary">({u.username})</Text>
        </Space>
      ),
    }));
  }, [suggestions]);

  const usernameOptions = useMemo(() => {
    return (suggestions ?? []).map((u) => ({
      value: u.username, // ✅ 唯一
      label: (
        <Space size={8}>
          <Text>{u.username}</Text>
          <Text type="secondary">({u.name})</Text>
        </Space>
      ),
    }));
  }, [suggestions]);

  const deptOptions = useMemo(() => {
    return (departments ?? []).map((d) => ({
      value: d.id,
      label: d.department,
    }));
  }, [departments]);

  useEffect(() => {
    if (!open) return;

    if (!values) {
      form.resetFields();
      return;
    }

    form.setFieldsValue(values as any);
  }, [open, values, form]);

  const pickByUsername = (username: string) => {
    const picked = (suggestions ?? []).find((x) => x.username === username);
    if (!picked) return;

    onPickUser(picked);
    form.setFieldsValue({
      name: picked.name,
      username: picked.username,
    } as any);
  };

  return (
    <Modal
      title="任命职务"
      open={open}
      onCancel={onClose}
      okText="确认任命"
      cancelText="取消"
      confirmLoading={!!submitting}
      onOk={() => {
        void form
          .validateFields()
          .then((vals) => onSubmit(vals))
          .catch(() => void 0);
      }}
      destroyOnClose
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          role: 3 as Role,
          ...(values ?? {}),
        }}
      >
        {/* 1) 姓名：展示姓名，但实际选择 value 用 username（唯一） */}
        <Form.Item
          label="姓名"
          name="name"
          rules={[
            { required: true, message: "请选择姓名" },
            { whitespace: true, message: "姓名不能为空" },
          ]}
        >
          <Select
            showSearch
            allowClear
            placeholder="输入姓名或学号进行搜索"
            filterOption={false}
            options={nameOptions}
            notFoundContent={
              searchingSuggestion ? <Spin size="small" /> : "暂无匹配"
            }
            /**
             * ✅ 注意：这里 onSelect 返回的是 username（不是 name）
             */
            onSearch={(v) => void onSearchUser(v)}
            onSelect={(username) => pickByUsername(String(username))}
            onClear={() => {
              clearPickedUser();
              void onSearchUser("");
              form.setFieldsValue({ name: "", username: "" } as any);
            }}
          />
        </Form.Item>

        {/* 2) 学号：value 也是 username（唯一） */}
        <Form.Item
          label="学号"
          name="username"
          rules={[{ required: true, message: "请选择学号" }]}
        >
          <Select
            showSearch
            allowClear
            placeholder="输入学号或姓名进行搜索"
            filterOption={false}
            options={usernameOptions}
            notFoundContent={
              searchingSuggestion ? <Spin size="small" /> : "暂无匹配"
            }
            onSearch={(v) => void onSearchUser(v)}
            onSelect={(username) => pickByUsername(String(username))}
            onClear={() => {
              clearPickedUser();
              void onSearchUser("");
              form.setFieldsValue({ name: "", username: "" } as any);
            }}
          />
        </Form.Item>

        {/* 3) 部门 */}
        <Form.Item
          label="部门"
          name="departmentId"
          rules={[{ required: true, message: "请选择部门" }]}
        >
          <Select
            placeholder="请选择部门"
            loading={!!loadingDepartments}
            options={deptOptions}
          />
        </Form.Item>

        {/* 4) 职务 */}
        <Form.Item
          label="职务"
          name="role"
          rules={[{ required: true, message: "请选择职务" }]}
        >
          <Select placeholder="请选择职务" options={roleOptions()} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
