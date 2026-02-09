// src/features/profile/hooks/useProfile.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ModifyPasswordPayload,
  UpdateEmailPayload,
  UserInfo,
  OperationResult,
} from "../types";
import { getMyProfile, modifyPassword, updateEmail } from "../api";
import { ApiError } from "../../../shared/http/error";

import { useProfileMyActivitiesTable } from "./useProfileMyActivitiesTable";

/**
 * useProfile（方案 B）
 * - 只管：数据获取 / 提交动作 / 状态（loading、submitting）
 * - 不做：message 提示
 * - 失败：直接 throw（页面 catch 后统一提示）
 * - 表格：交给 useProfileMyActivitiesTable
 */
export function useProfile() {
  // ===== 用户信息 =====
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);

  // 防并发
  const loadingProfileRef = useRef(false);

  const reloadProfile = useCallback(async () => {
    if (loadingProfileRef.current) return;

    loadingProfileRef.current = true;
    setLoadingProfile(true);
    setProfileError(null);

    try {
      const u = await getMyProfile();
      setProfile(u);
      return u;
    } catch (e) {
      setProfileError(e);
      throw e;
    } finally {
      loadingProfileRef.current = false;
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void reloadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 修改邮箱/密码 =====
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const submittingEmailRef = useRef(false);
  const submittingPasswordRef = useRef(false);

  const submitUpdateEmail = useCallback(
    async (payload: UpdateEmailPayload): Promise<OperationResult> => {
      if (submittingEmailRef.current) return null;

      submittingEmailRef.current = true;
      setSubmittingEmail(true);

      try {
        const msg = await updateEmail(payload);
        // 本地乐观更新（避免再拉一次 profile）
        setProfile((prev) => (prev ? { ...prev, email: payload.email } : prev));
        return msg;
      } finally {
        submittingEmailRef.current = false;
        setSubmittingEmail(false);
      }
    },
    [],
  );

  const submitModifyPassword = useCallback(
    async (payload: ModifyPasswordPayload): Promise<OperationResult> => {
      if (submittingPasswordRef.current) return null;

      submittingPasswordRef.current = true;
      setSubmittingPassword(true);

      try {
        const msg = await modifyPassword(payload);
        return msg;
      } finally {
        submittingPasswordRef.current = false;
        setSubmittingPassword(false);
      }
    },
    [],
  );

  // ===== 错误信息（给页面展示 Empty 用）=====
  const profileErrorMessage = useMemo(() => {
    if (!profileError) return "";
    if (profileError instanceof ApiError) return profileError.message;
    return "加载用户信息失败";
  }, [profileError]);

  // ===== 我的活动表格（三件套 Hook）=====
  const myActivitiesTable = useProfileMyActivitiesTable();

  return {
    // 用户信息
    profile,
    loadingProfile,
    profileError,
    profileErrorMessage,
    reloadProfile,

    // 修改邮箱/密码
    submittingEmail,
    submittingPassword,
    submitUpdateEmail,
    submitModifyPassword,

    // 表格
    myActivitiesTable,
  };
}
