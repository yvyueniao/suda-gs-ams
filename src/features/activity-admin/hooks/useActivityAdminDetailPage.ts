// src/features/activity-admin/hooks/useActivityAdminDetailPage.ts

/**
 * useActivityAdminDetailPage
 *
 * 职责：
 * - ActivityAdminDetailPage 的业务编排（详情数据 + 编辑弹窗 + 刷新）
 * - 数据源：POST /activity/searchById（已封装到 features/activity-admin/api.ts）
 *
 * 能力：
 * - 拉取详情：loading / error / detail
 * - 刷新：reload()
 * - 编辑弹窗：openEdit / closeEdit / submitUpdate（成功后自动 reload）
 *
 * 约定：
 * - ✅ 只做业务编排，不做 UI（不 message / 不 Modal）
 * - ✅ 不直接 request，统一走 api.ts
 * - ✅ 入参兜底：activityId 非法时不请求，返回空态 + error
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAsyncAction } from "../../../shared/actions";

import type { ManageableActivityItem, UpdateActivityPayload } from "../types";
import { fetchActivityDetailById, updateActivityInfo } from "../api";

export function useActivityAdminDetailPage(activityId: number) {
  /**
   * 0️⃣ 入参兜底：activityId 非法时，不请求
   */
  const validId = Number.isFinite(activityId) && activityId > 0;

  /**
   * 1️⃣ 详情数据状态
   */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<ManageableActivityItem | null>(null);

  /**
   * 2️⃣ 编辑弹窗状态（本页只有 edit，不做 create）
   */
  const [modalOpen, setModalOpen] = useState(false);

  const openEdit = useCallback(() => {
    if (!detail) return;
    setModalOpen(true);
  }, [detail]);

  const closeEdit = useCallback(() => {
    setModalOpen(false);
  }, []);

  /**
   * 3️⃣ 拉取详情（统一走 api.ts）
   */
  const fetchDetail = useCallback(async () => {
    if (!validId) {
      setDetail(null);
      setError(new Error("非法活动 ID"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const resp = await fetchActivityDetailById({ id: activityId });

      // 你 api.ts 返回的是 ActivityDetailResponse（包含 activity）
      setDetail(resp.activity as unknown as ManageableActivityItem);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activityId, validId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  /**
   * 4️⃣ 提交修改（成功后：关闭弹窗 + reload）
   * - toast 由 useAsyncAction 统一处理
   */
  const update = useAsyncAction({
    successMessage: "修改成功",
    silentUnauthorized: true,
  });

  const submitUpdate = useCallback(
    async (payload: UpdateActivityPayload) => {
      const r = await update.run(async () => {
        return await updateActivityInfo(payload);
      });

      // 成功（run 未抛错）=> 关闭弹窗 + 刷新详情
      if (r !== undefined) {
        closeEdit();
        await fetchDetail();
      }

      return r;
    },
    [update, closeEdit, fetchDetail],
  );

  /**
   * 5️⃣ 派生值：Header 副标题（类型：名称）
   */
  const headerSubtitle = useMemo(() => {
    if (!detail) return "详情加载中…";
    const typeText = detail.type === 0 ? "活动" : "讲座";
    return `${typeText}：${detail.name}`;
  }, [detail]);

  return {
    // data
    detail,
    loading,
    error,

    // actions
    reload: fetchDetail,

    // modal
    modalOpen,
    openEdit,
    closeEdit,

    // submit
    submitUpdate,
    updating: update.loading,

    // derived
    headerSubtitle,
  };
}
