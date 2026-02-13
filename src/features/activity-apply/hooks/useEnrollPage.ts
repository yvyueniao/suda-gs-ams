// src/features/activity-apply/hooks/useEnrollPage.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchActivityById } from "../api";
import type { ActivityDetailResponse, EnrollTableRow } from "../types";
import { useEnrollTable } from "./useEnrollTable";
import { useApplyFlow } from "./useApplyFlow";

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

export function useEnrollPage(options?: {
  onNotify?: (payload: {
    kind: "success" | "error" | "info";
    msg: string;
  }) => void;
}) {
  // =========================
  // 1) 详情弹窗状态
  // =========================
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
    if (id) await loadDetail(id);
  }, [detailState.activityId, loadDetail]);

  // =========================
  // 2) 补报名弹窗状态
  // =========================
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

  // =========================
  // 3) 用 ref 桥接：让 onRegister 能“晚绑定”到 applyFlow
  // =========================
  const applyFlowRef = useRef<ReturnType<typeof useApplyFlow> | null>(null);

  // 这个函数会被 buildEnrollColumns 固定住，所以必须稳定（不要依赖 applyFlow）
  const onRegisterViaFlow = useCallback(async (row: EnrollTableRow) => {
    // 如果这里为空，说明 flow 还没写入 ref（理论上不会发生在用户点击时）
    await applyFlowRef.current?.startRegister({ id: row.id, name: row.name });
  }, []);

  // =========================
  // 4) 先创建 table（把 onRegister 传进去），拿到 applyActions
  // =========================
  const { table, applyActions } = useEnrollTable({
    onOpenDetail: (id) => {
      void loadDetail(id);
    },

    // ✅ 关键：报名按钮永远走这个入口，它再转发给 applyFlowRef
    onRegister: onRegisterViaFlow,
  });

  // =========================
  // 5) 再创建 applyFlow（复用同一套 applyActions）
  // =========================
  const applyFlow = useApplyFlow({
    applyActions, // ✅ 复用 table 内同一套 actions
    onChanged: async () => {
      await table.reload();
    },
    onNotify: options?.onNotify,
    enableCandidateInFailModal: true,
    muteActionErrorToast: true,
  });

  // ✅ 把 flow 写进 ref，供 onRegisterViaFlow 使用
  useEffect(() => {
    applyFlowRef.current = applyFlow;
  }, [applyFlow]);

  return useMemo(
    () => ({
      table,
      applyActions,
      applyFlow,

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
    [
      table,
      applyActions,
      applyFlow,
      detailState,
      supplement,
      loadDetail,
      closeDetail,
      reloadDetail,
      openSupplement,
      closeSupplement,
    ],
  );
}
