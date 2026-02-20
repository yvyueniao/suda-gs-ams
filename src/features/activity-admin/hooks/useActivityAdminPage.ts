// src/features/activity-admin/hooks/useActivityAdminPage.ts

/**
 * useActivityAdminPage
 *
 * 职责：
 * - 活动/讲座管理页（ActivityAdminPage）的业务编排聚合
 * - 聚合：table（useActivityAdminTable）+ 创建/编辑弹窗状态 + 删除动作按行 loading
 * - 暴露：openCreate/openEdit/closeModal、submitCreate/submitUpdate/submitDelete、navigateToDetail
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message、不 Modal）
 * - ✅ 不维护按钮 loading（交给 shared/actions/useAsyncAction/useAsyncMapAction）
 * - ✅ 成功后触发 table.reload() 刷新列表
 */

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAsyncMapAction } from "../../../shared/actions";

import type {
  CreateActivityPayload,
  ManageableActivityItem,
  UpdateActivityPayload,
} from "../types";
import { createActivity, updateActivityInfo, deleteActivity } from "../api";

import { useActivityAdminTable } from "./useActivityAdminTable";

type ModalMode = "create" | "edit";

export function useActivityAdminPage() {
  const navigate = useNavigate();

  /**
   * 1️⃣ 表格编排
   */
  const table = useActivityAdminTable();

  /**
   * 2️⃣ 弹窗状态（create/edit 共用一个 UpsertModal）
   */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<ManageableActivityItem | null>(null);

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((record: ManageableActivityItem) => {
    setModalMode("edit");
    setEditing(record);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  /**
   * 3️⃣ 删除动作 loading（按 id 维度）
   * - 你的 useAsyncMapAction API：isLoading(key) / run(key, fn)
   */
  const del = useAsyncMapAction<number>({
    // 这里不需要 keyOf，你的 run 会直接传 key
    // successMessage / errorMessage 如需可加（但你也可以让 UI 层 toast）
    silentUnauthorized: true,
  });

  const isDeleting = useCallback((id: number) => del.isLoading(id), [del]);

  /**
   * 4️⃣ 提交动作：create / update / delete
   * ✅ 成功后统一 reload
   */
  const submitCreate = useCallback(
    async (payload: CreateActivityPayload) => {
      await createActivity(payload);
      await table.reload();
    },
    [table],
  );

  const submitUpdate = useCallback(
    async (payload: UpdateActivityPayload) => {
      await updateActivityInfo(payload);
      await table.reload();
    },
    [table],
  );

  const submitDelete = useCallback(
    async (record: ManageableActivityItem) => {
      await del.run(record.id, async () => {
        await deleteActivity({ id: record.id });
        // deleteActivity 返回 string 也没关系，这里不依赖返回值
        return undefined as unknown as void;
      });

      await table.reload();
    },
    [del, table],
  );

  /**
   * 5️⃣ 详情跳转（隐藏路由）
   */
  const navigateToDetail = useCallback(
    (id: number) => {
      navigate(`/activity-admin/detail/${id}`);
    },
    [navigate],
  );

  /**
   * 6️⃣ 给页面层更好用的派生值
   */
  const modal = useMemo(() => {
    return {
      open: modalOpen,
      mode: modalMode,
      editing, // edit 模式下回填用
      openCreate,
      openEdit,
      close: closeModal,
    };
  }, [modalOpen, modalMode, editing, openCreate, openEdit, closeModal]);

  return {
    table,

    modal,

    // actions
    submitCreate,
    submitUpdate,
    submitDelete,

    // delete loading
    isDeleting,

    // navigation
    navigateToDetail,
  };
}
