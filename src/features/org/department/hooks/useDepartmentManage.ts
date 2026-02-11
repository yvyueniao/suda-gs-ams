// src/features/org/department/hooks/useDepartmentManage.ts

/**
 * useDepartmentManage
 *
 * V1 职责：
 * - 聚合「部门表格编排」useDepartmentTable
 * - 暴露“创建 / 删除”两个提交方法（不做 loading / toast）
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message、不 Modal）
 * - ✅ 不维护按钮 loading（交给 shared/actions）
 * - ✅ 创建/删除成功后，触发 table.reload() 刷新列表
 */

import { useCallback } from "react";

import type {
  CreateDepartmentPayload,
  DeleteDepartmentPayload,
} from "../types";
import { createDepartment, deleteDepartment } from "../api";
import { useDepartmentTable } from "./useDepartmentTable";

export function useDepartmentManage() {
  const table = useDepartmentTable();

  const submitCreate = useCallback(
    async (payload: CreateDepartmentPayload) => {
      await createDepartment(payload);
      await table.reload();
    },
    [table],
  );

  const submitDelete = useCallback(
    async (payload: DeleteDepartmentPayload) => {
      await deleteDepartment(payload);
      await table.reload();
    },
    [table],
  );

  return {
    table,
    submitCreate,
    submitDelete,
  };
}
