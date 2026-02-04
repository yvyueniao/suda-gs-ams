// src/features/profile/hooks/useProfile.ts
/**
 * useProfile
 *
 * 职责：
 * - 编排个人中心页面需要的数据加载流程
 *   1) 拉取用户信息（真实接口 /user/info）
 *   2) 拉取“我的活动/讲座列表”（当前 mock /profile/myActivities）
 * - 统一管理 loading / error
 *
 * 设计原则：
 * - 页面层只拿数据与状态，不关心接口细节
 * - 不依赖 shared/components/table（个人中心先不做表格化）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";

import { getMyActivities, getUserInfo } from "../api";
import type { MyActivityItem, UserInfo } from "../types";
import type { ListResult } from "../../../shared/http/types";

type UseProfileState = {
  user: UserInfo | null;
  myActivities: ListResult<MyActivityItem> | null;
  loading: boolean;
  error: unknown;
};

type UseProfileOptions = {
  /** 初始页码（用于“我的活动/讲座列表”，目前可先不分页也没关系） */
  initialPage?: number;
  initialPageSize?: number;

  /**
   * 是否自动弹出错误提示
   * - 默认 true
   * - 你项目里有“401/403 不 toast”的习惯；这里先保持温和策略
   */
  toastOnError?: boolean;
};

export function useProfile(options?: UseProfileOptions) {
  const initialPage = options?.initialPage ?? 1;
  const initialPageSize = options?.initialPageSize ?? 10;
  const toastOnError = options?.toastOnError ?? true;

  const [state, setState] = useState<UseProfileState>({
    user: null,
    myActivities: null,
    loading: false,
    error: null,
  });

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [keyword, setKeyword] = useState<string>("");

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // 并行加载：用户信息 + 我的活动列表
      const [user, myActivities] = await Promise.all([
        getUserInfo(),
        getMyActivities({ page, pageSize, keyword }),
      ]);

      setState({
        user,
        myActivities,
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: e }));
      if (toastOnError) {
        message.error("加载个人中心数据失败，请稍后重试");
      }
    }
  }, [page, pageSize, keyword, toastOnError]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  // 便捷派生：讲座次数（你后端 userInfo 里也有 lectureNum，但为了 mock 自洽，可双保险）
  const lectureCount = useMemo(() => {
    const fromUser = state.user?.lectureNum;
    if (typeof fromUser === "number") return fromUser;

    const list = state.myActivities?.list ?? [];
    return list.filter((x) => x.category === "lecture").length;
  }, [state.user?.lectureNum, state.myActivities]);

  // 便捷派生：社会服务分（后端有 serviceScore；同理双保险）
  const serviceScore = useMemo(() => {
    const fromUser = state.user?.serviceScore;
    if (typeof fromUser === "number") return fromUser;

    const list = state.myActivities?.list ?? [];
    return list.reduce((sum, x) => sum + (x.serviceScoreGain ?? 0), 0);
  }, [state.user?.serviceScore, state.myActivities]);

  return {
    // data
    user: state.user,
    myActivities: state.myActivities,

    // state
    loading: state.loading,
    error: state.error,

    // derived
    lectureCount,
    serviceScore,

    // controls
    page,
    pageSize,
    keyword,
    setPage,
    setPageSize,
    setKeyword,

    // actions
    reload,
  };
}
