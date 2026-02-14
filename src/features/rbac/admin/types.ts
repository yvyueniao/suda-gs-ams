// src/features/rbac/admin/types.ts

/**
 * ======================================
 * 角色定义（与全局保持一致）
 * ======================================
 */

export type Role = 0 | 1 | 2 | 3 | 4;

export const ROLE_LABEL: Record<Role, string> = {
  0: "管理员",
  1: "主席",
  2: "部长",
  3: "干事",
  4: "普通学生",
};

/**
 * ======================================
 * 部门成员（/department/allMembers）
 * ======================================
 */

export interface DepartmentMemberItem {
  id: number;
  username: string;
  name: string;
  invalid: boolean;
  role: Role;
  menuPermission: unknown | null;

  email: string;
  major: string;
  grade: string;

  createTime: string;
  lastLoginTime: string;

  serviceScore: number;
  lectureNum: number;

  department: string | null;
}

/**
 * 表格行类型（可直接复用后端结构）
 */
export type AdminMemberTableRow = DepartmentMemberItem;

/**
 * ======================================
 * 部门下拉（/department/allDepartment）
 * ======================================
 */

export interface DepartmentOption {
  id: number;
  department: string;
}

/**
 * ======================================
 * 任命职务（/department/appointRole）
 * ======================================
 */

export interface AppointRolePayload {
  username: string;
  departmentId: number;
  role: Role;
}

/**
 * ======================================
 * 删除部门成员（/department/deleteMember）
 * ======================================
 */

export interface DeleteMemberPayload {
  username: string;
}

/**
 * ======================================
 * 姓名联想（复用 /user/pages）
 * ======================================
 */

export interface UserSuggestion {
  id: number;
  username: string;
  name: string;
  role: Role;
  department: string | null;
}

/**
 * ======================================
 * 表单模型（任命弹窗内部使用）
 * ======================================
 */

export interface AppointRoleFormValues {
  name: string; // 输入姓名
  username: string; // 自动回填（只读）
  departmentId: number; // 选择部门
  role: Role; // 选择职务
}
