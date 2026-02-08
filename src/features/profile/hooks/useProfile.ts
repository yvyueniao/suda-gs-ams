// src/features/profile/hooks/useProfile.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";

import { getMyActivities, getUserInfo, getActivityDetailById } from "../api";
import type { MyActivityItem, UserInfo, ProfileActivityDetail } from "../types";
import { setToken } from "../../../shared/session/token";
import { ApiError } from "../../../shared/http/error";

/* =========================
 * state 定义
 * ========================= */

type UseProfileState = {
  user: UserInfo | null;
  activities: MyActivityItem[];
  loading: boolean;
  error: string | null;

  // —— 详情相关 ——
  detailLoading: boolean;
  currentDetail: ProfileActivityDetail | null;
};

/* =========================
 * Hook 实现
 * ========================= */

export function useProfile() {
  const [state, setState] = useState<UseProfileState>({
    user: null,
    activities: [],
    loading: true,
    error: null,
    detailLoading: false,
    currentDetail: null,
  });

  /* ---------- 主数据加载 ---------- */
  const load = useCallback(async () => {
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
    }));

    try {
      const [userData, activities] = await Promise.all([
        getUserInfo(), // { user, token }
        getMyActivities(), // MyActivityItem[]
      ]);

      // token 续期
      if (userData?.token) {
        setToken(userData.token);
      }

      setState((s) => ({
        ...s,
        user: userData.user,
        activities: Array.isArray(activities) ? activities : [],
        loading: false,
        error: null,
      }));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "加载失败";

      message.error(msg);

      setState((s) => ({
        ...s,
        loading: false,
        error: msg,
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  /* ---------- 详情加载（方案 C 核心） ---------- */
  const loadActivityDetail = useCallback(async (activityId: number) => {
    setState((s) => ({
      ...s,
      detailLoading: true,
      currentDetail: null,
    }));

    try {
      const { activity } = await getActivityDetailById(activityId);

      setState((s) => ({
        ...s,
        detailLoading: false,
        currentDetail: activity,
      }));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "获取活动详情失败";

      message.error(msg);

      setState((s) => ({
        ...s,
        detailLoading: false,
        currentDetail: null,
      }));
    }
  }, []);

  const clearDetail = useCallback(() => {
    setState((s) => ({
      ...s,
      currentDetail: null,
    }));
  }, []);

  /* ---------- 稳定引用导出 ---------- */
  return {
    // 主体数据
    user: state.user,
    activities: useMemo(() => state.activities, [state.activities]),
    loading: state.loading,
    error: state.error,
    reload,

    // 详情能力（供 ProfilePage 使用）
    detailLoading: state.detailLoading,
    currentDetail: state.currentDetail,
    loadActivityDetail,
    clearDetail,
  };
}
