// src/pages/rbac/admin/AppointRoleModal.tsx
/**
 * AppointRoleModal
 *
 * ✅ 页面层组件（UI）
 * - 只负责渲染 Modal + Form，不直接请求接口
 * - 姓名联想/回填/提交动作：全部由父层（useAdminManagePage）注入
 *
 * 表单字段：
 * 1) 姓名（可输入，输入时触发 onNameInputChange；下拉联想）
 * 2) 学号 username（只读，由选择联想用户后自动回填）
 * 3) 部门 departmentId（下拉；来自 departments）
 * 4) 职务 role（下拉；固定选项）
 */

import { useEffect, useMemo } from "react";
import { Modal, Form, Input, Select, Space, Spin, Typography } from "antd";

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

  /** 联想候选（由 hook 管理） */
  suggestions: UserSuggestion[];
  searchingSuggestion?: boolean;

  /** 表单回填值（由 hook 管理） */
  values?: Partial<AppointRoleFormValues>;

  /** 姓名输入变化：父层去做搜索（可加 debounce） */
  onNameInputChange: (name: string) => void | Promise<unknown>;

  /** 选择某个联想项：父层回填 username */
  onPickSuggestion: (u: UserSuggestion) => void;

  /** 提交任命 */
  submitting?: boolean;
  onSubmit: (values: AppointRoleFormValues) => void | Promise<unknown>;
};

function roleOptions() {
  // 固定：管理员/主席/部长/干事（通常任命不会给“普通学生”，但你也可保留）
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
    onNameInputChange,
    onPickSuggestion,
    submitting,
    onSubmit,
  } = props;

  const [form] = Form.useForm<AppointRoleFormValues>();

  // 打开时：同步父层 values（支持回填 username）
  useEffect(() => {
    if (!open) return;
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

  const sugOptions = useMemo(() => {
    return (suggestions ?? []).map((u) => ({
      value: u.name, // Select 的值用 name；真正的对象用 onSelect 里查
      label: (
        <Space size={8}>
          <Text>{u.name}</Text>
          <Text type="secondary">({u.username})</Text>
        </Space>
      ),
    }));
  }, [suggestions]);

  const handleSelectSuggestion = (nameValue: string) => {
    const picked = (suggestions ?? []).find((x) => x.name === nameValue);
    if (!picked) return;
    onPickSuggestion(picked);
    // UI 同步：把“姓名”写回表单（username 会由父层 values 回填后 effect setFieldsValue）
    form.setFieldValue("name", picked.name);
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
        {/* 1) 姓名：带联想下拉 */}
        <Form.Item
          label="姓名"
          name="name"
          rules={[
            { required: true, message: "请输入姓名" },
            { whitespace: true, message: "姓名不能为空" },
          ]}
        >
          <Select
            showSearch
            allowClear
            placeholder="输入姓名（模糊匹配）"
            filterOption={false} // ✅ 交给后端/父层搜索
            options={sugOptions}
            notFoundContent={
              searchingSuggestion ? <Spin size="small" /> : "暂无匹配"
            }
            onSearch={(v) => void onNameInputChange(v)}
            onChange={(v) => {
              // allowClear 时 v 可能为 undefined
              if (!v) {
                // 清空时也通知父层清 suggestions
                void onNameInputChange("");
                form.setFieldValue("username", "" as any);
              }
            }}
            onSelect={handleSelectSuggestion}
          />
        </Form.Item>

        {/* 2) 学号：只读自动回填 */}
        <Form.Item
          label="学号"
          name="username"
          rules={[{ required: true, message: "请选择姓名以自动回填学号" }]}
        >
          <Input placeholder="选择姓名后自动回填" readOnly />
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

        <Text type="secondary">
          提示：姓名联想使用分页接口兜底搜索；请先选择联想项再提交。
        </Text>
      </Form>
    </Modal>
  );
}
