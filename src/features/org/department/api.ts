// src/features/org/department/api.ts

/**
 * Org / Department API
 *
 * V1 范围：
 * - 获取所有部门
 * - 创建部门
 * - 删除部门
 *
 * 约定：
 * - 只做 request 调用
 * - 不做 toast
 * - 不做 loading
 * - 不做错误提示（交给 shared/http + shared/actions 处理）
 */

import { request } from "../../../shared/http/client";
import type {
  DepartmentItem,
  CreateDepartmentPayload,
  DeleteDepartmentPayload,
} from "./types";

/**
 * 获取所有部门
 * POST /department/allDepartment
 */
export async function fetchAllDepartments(): Promise<DepartmentItem[]> {
  const resp = await request<DepartmentItem[]>({
    url: "/department/allDepartment",
    method: "POST",
  });

  return resp;
}

/**
 * 创建部门
 * POST /department/create
 */
export async function createDepartment(
  payload: CreateDepartmentPayload,
): Promise<string> {
  const resp = await request<string>({
    url: "/department/create",
    method: "POST",
    data: payload,
  });

  return resp;
}

/**
 * 删除部门
 * POST /department/delete
 */
export async function deleteDepartment(
  payload: DeleteDepartmentPayload,
): Promise<string> {
  const resp = await request<string>({
    url: "/department/delete",
    method: "POST",
    data: payload,
  });

  return resp;
}
