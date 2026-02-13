// src/features/activity-apply/hooks/useEnrollPage.ts

import { useCallback, useMemo, useState } from "react";
import { searchActivityById } from "../api";
import type { ActivityDetailResponse } from "../types";
import { useEnrollTable } from "./useEnrollTable"; // 引入 useEnrollTable 钩子

export type EnrollDetailState = {
  visible: boolean;
  activityId: number | null;
  loading: boolean;
  error: unknown;
  detail: ActivityDetailResponse["activity"] | null;
};

export type SupplementApplyState = {
  visible: boolean;
  activityId: number | null;
};

export function useEnrollPage() {
  const { table, applyActions } = useEnrollTable(); // 获取表格和操作方法

  // 详情状态管理
  const [detailState, setDetailState] = useState<EnrollDetailState>({
    visible: false,
    activityId: null,
    loading: false,
    error: null,
    detail: null,
  });

  const closeDetail = useCallback(() => {
    setDetailState({
      visible: false,
      activityId: null,
      loading: false,
      error: null,
      detail: null,
    });
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setDetailState({
      visible: true,
      activityId: id,
      loading: true,
      error: null,
      detail: null,
    });

    try {
      const resp = await searchActivityById({ id });
      setDetailState({
        visible: true,
        activityId: id,
        loading: false,
        error: null,
        detail: resp.activity ?? null,
      });
    } catch (err) {
      setDetailState({
        visible: true,
        activityId: id,
        loading: false,
        error: err,
        detail: null,
      });
    }
  }, []);

  const reloadDetail = useCallback(async () => {
    const id = detailState.activityId;
    if (id) {
      await loadDetail(id);
    }
  }, [detailState.activityId, loadDetail]);

  // 补报名状态
  const [supplement, setSupplement] = useState<SupplementApplyState>({
    visible: false,
    activityId: null,
  });

  const openSupplement = useCallback((activityId: number) => {
    setSupplement({ visible: true, activityId });
  }, []);

  const closeSupplement = useCallback(() => {
    setSupplement({ visible: false, activityId: null });
  }, []);

  return useMemo(
    () => ({
      table, // 返回表格对象
      applyActions, // 返回 applyActions
      detail: {
        ...detailState,
        openDetail: loadDetail,
        closeDetail,
        reloadDetail,
      },
      supplement: {
        ...supplement,
        openSupplement,
        closeSupplement,
      },
    }),
    [table, detailState, supplement, loadDetail, closeDetail, reloadDetail],
  );
}
