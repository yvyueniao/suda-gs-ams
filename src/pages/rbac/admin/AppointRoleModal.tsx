// src/pages/rbac/admin/AppointRoleModal.tsx
/**
 * AppointRoleModal
 *
 * ✅ 页面层组件（UI）
 * - 只负责渲染 Modal + Form，不直接请求接口
 * - 姓名/学号联想/回填/提交动作：全部由父层（useAdminManagePage）注入
 *
 * 表单字段：
 * 1) 姓名（下拉可搜；与“学号”共用同一份 suggestions）
 * 2) 学号（下拉可搜；与“姓名”共用同一份 suggestions）
 * 3) 部门 departmentId（下拉；来自 departments）
 * 4) 职务 role（下拉；固定选项）
 *
 * ✅ 关键：修改任一端（姓名/学号）都会触发 onSearchUser
 * - 选中任一端 -> onPickUser -> 父层强一致回填 name/username
 * - 清空任一端 -> clearPickedUser -> 父层清掉选择，避免不一致
 */

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

  /** 部门下拉数据（动态） */
  departments: DepartmentOption[];
  loadingDepartments?: boolean;

  /** 联想候选（由 hook 管理，共用） */
  suggestions: UserSuggestion[];
  searchingSuggestion?: boolean;

  /** 表单回填值（由 hook 管理：name/username 永远强一致） */
  values?: Partial<AppointRoleFormValues>;

  /** ✅ 共用搜索：输入姓名/学号都调这个 */
  onSearchUser: (key: string) => void | Promise<unknown>;

  /** ✅ 选中用户：姓名/学号任一端选中都走这里 */
  onPickUser: (u: UserSuggestion) => void;

  /** ✅ 清空：任一端 allowClear 时调用，避免两者不一致 */
  clearPickedUser: () => void;

  /** 提交任命 */
  submitting?: boolean;
  onSubmit: (values: AppointRoleFormValues) => void | Promise<unknown>;
};

function roleOptions() {
  // 固定：主席/部长/干事（通常任命不会给“普通学生”，你也可按需扩展）
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

  // 打开时：同步父层 values（父层负责强一致回填 name/username）
  useEffect(() => {
    if (!open) return;

    // destroyOnClose 开着，其实每次 open 都是新表单；
    // 这里仍保留 setFieldsValue，确保父层回填及时反映到 UI
    if (!values) {
      form.resetFields();
      return;
    }
    form.setFieldsValue(values as any);
  }, [open, values, form]);

  const deptOptions = useMemo(() => {
    return (departments ?? []).map((d) => ({
      value: d.id,
      label: d.department,
    }));
  }, [departments]);

  // ✅ 姓名下拉 options（value 用 username，保证唯一；label 展示 name + username）
  const nameOptions = useMemo(() => {
    return (suggestions ?? []).map((u) => ({
      value: u.username,
      label: (
        <Space size={8}>
          <Text>{u.name}</Text>
          <Text type="secondary">({u.username})</Text>
        </Space>
      ),
    }));
  }, [suggestions]);

  // ✅ 学号下拉 options（value 也用 username；label 反过来展示 username + name）
  const usernameOptions = useMemo(() => {
    return (suggestions ?? []).map((u) => ({
      value: u.username,
      label: (
        <Space size={8}>
          <Text>{u.username}</Text>
          <Text type="secondary">({u.name})</Text>
        </Space>
      ),
    }));
  }, [suggestions]);

  const pickByUsername = (username: string) => {
    const picked = (suggestions ?? []).find((x) => x.username === username);
    if (!picked) return;
    onPickUser(picked);
    // UI 侧立即同步，父层 values 回填也会再次 setFieldsValue（幂等）
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
          role: 3 as Role, // 默认干事
          ...(values ?? {}),
        }}
      >
        {/* 1) 姓名：下拉可搜（共用 suggestions） */}
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
            // ✅ Select 的 value 是表单字段 name（string），这里不直接把 username 放到 name 里
            // 所以我们用 onSelect 去 pick，并在 pick 时 setFieldsValue 把 name/username 写回
            // options 的 value 统一用 username（唯一）
            options={nameOptions}
            notFoundContent={
              searchingSuggestion ? <Spin size="small" /> : "暂无匹配"
            }
            onSearch={(v) => void onSearchUser(v)}
            onClear={() => {
              clearPickedUser();
              void onSearchUser("");
              form.setFieldsValue({ name: "", username: "" } as any);
            }}
            onSelect={(username) => pickByUsername(String(username))}
            // ✅ 让输入框显示“name”
            // 这里通过 Form 的 name 字段控制显示：父层回填 values.name -> effect setFieldsValue
            // 因此不用额外配置 labelInValue
          />
        </Form.Item>

        {/* 2) 学号：下拉可搜（共用 suggestions） */}
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
            onClear={() => {
              clearPickedUser();
              void onSearchUser("");
              form.setFieldsValue({ name: "", username: "" } as any);
            }}
            onSelect={(username) => pickByUsername(String(username))}
          />
        </Form.Item>

        {/* 3) 部门：动态下拉 */}
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

        {/* 4) 职务：固定下拉 */}
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
