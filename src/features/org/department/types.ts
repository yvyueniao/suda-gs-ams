// src/features/org/department/types.ts

/**
 * Org / Department Domain Types
 *
 * V1 范围：
 * - 获取所有部门
 * - 创建部门
 * - 删除部门
 *
 * 严格对齐当前后端接口文档
 */

// ======================================================
// Entity
// ======================================================

/** 部门条目（来自 /department/allDepartment） */
export type DepartmentItem = {
  /** 部门 ID */
  id: number;

  /** 部门名称 */
  department: string;
};

// ======================================================
// Payloads
// ======================================================

/** 创建部门（/department/create） */
export type CreateDepartmentPayload = {
  department: string;
};

/** 删除部门（/department/delete） */
export type DeleteDepartmentPayload = {
  departmentId: number;
};
