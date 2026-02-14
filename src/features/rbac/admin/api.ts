// src/features/rbac/admin/api.ts
/**
 * ============================================
 * RBAC Admin API
 * ============================================
 *
 * 管理员管理页相关接口封装（纯 request，不做 UI）
 *
 * 约定：
 * - 统一走 shared/http 的 request
 * - 不做 toast
 * - 不维护状态
 * - 返回值尽量贴近后端 data
 */

import { request } from "../../../shared/http/client";

import type {
  AppointRolePayload,
  DeleteMemberPayload,
  DepartmentMemberItem,
  DepartmentOption,
  UserSuggestion,
  Role,
} from "./types";

/* =====================================================
 * 1️⃣ 获取所有部门成员（全量）
 * POST /department/allMembers
 * ===================================================== */
export async function getAllDepartmentMembers(): Promise<
  DepartmentMemberItem[]
> {
  return request<DepartmentMemberItem[]>({
    url: "/department/allMembers",
    method: "POST",
  });
}

/* =====================================================
 * 2️⃣ 删除部门成员
 * POST /department/deleteMember
 * ===================================================== */
export async function deleteDepartmentMember(
  payload: DeleteMemberPayload,
): Promise<string | null> {
  return request<string | null>({
    url: "/department/deleteMember",
    method: "POST",
    data: payload,
  });
}

/* =====================================================
 * 3️⃣ 获取所有部门（用于弹窗部门下拉）
 * POST /department/allDepartment
 * ===================================================== */
export async function getAllDepartments(): Promise<DepartmentOption[]> {
  return request<DepartmentOption[]>({
    url: "/department/allDepartment",
    method: "POST",
  });
}

/* =====================================================
 * 4️⃣ 任命职务
 * POST /department/appointRole
 * ===================================================== */
export async function appointRole(
  payload: AppointRolePayload,
): Promise<string> {
  return request<string>({
    url: "/department/appointRole",
    method: "POST",
    data: payload,
  });
}

/* =====================================================
 * 5️⃣ 姓名联想（复用 /user/pages）
 *
 * 用途：
 * - 任命弹窗输入姓名时调用
 * - 仅用于下拉建议
 * - 不走 table 体系
 *
 * POST /user/pages
 * ===================================================== */
export async function searchUserSuggestionsByName(params: {
  key: string;
  pageSize?: number;
}): Promise<UserSuggestion[]> {
  const pageSize = params.pageSize ?? 20;

  const res = await request<{
    count: number;
    pageNum: number;
    users: Array<{
      id: number;
      username: string;
      name: string;
      role: Role;
      department?: string | null;
    }>;
  }>({
    url: "/user/pages",
    method: "POST",
    data: {
      pageNum: 1,
      pageSize,
      key: params.key,
    },
  });

  return (res?.users ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    department: u.department ?? null,
  }));
}
