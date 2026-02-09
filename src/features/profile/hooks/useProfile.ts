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
 * useProfile（精简版）
 * - 只管：用户信息 + 修改邮箱/密码
 * - 表格：完全交给 useProfileMyActivitiesTable（三件套）
 */
export function useProfile() {
  // ===== 用户信息 =====
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);

  // ✅ 用 ref 防并发 + 保证 reloadProfile 不依赖 loadingProfile（函数引用稳定）
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

  // ✅ 首屏自动加载：只跑一次（不依赖 reloadProfile）
  useEffect(() => {
    void reloadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 修改邮箱/密码 =====
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const submittingEmailRef = useRef(false);
  const submittingPasswordRef = useRef(false);

  const submitUpdateEmail = useCallback(
    async (payload: UpdateEmailPayload): Promise<OperationResult> => {
      if (submittingEmailRef.current) return null;

      submittingEmailRef.current = true;
      setSubmittingEmail(true);
      setSubmitError(null);

      try {
        const msg = await updateEmail(payload);
        setProfile((prev) => (prev ? { ...prev, email: payload.email } : prev));
        return msg;
      } catch (e) {
        setSubmitError(e);
        throw e;
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
      setSubmitError(null);

      try {
        const msg = await modifyPassword(payload);
        return msg;
      } catch (e) {
        setSubmitError(e);
        throw e;
      } finally {
        submittingPasswordRef.current = false;
        setSubmittingPassword(false);
      }
    },
    [],
  );

  // ===== 错误信息（给页面直接用）=====
  const profileErrorMessage = useMemo(() => {
    if (!profileError) return "";
    if (profileError instanceof ApiError) return profileError.message;
    return "加载用户信息失败";
  }, [profileError]);

  const submitErrorMessage = useMemo(() => {
    if (!submitError) return "";
    if (submitError instanceof ApiError) return submitError.message;
    return "提交失败";
  }, [submitError]);

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
    submitError,
    submitErrorMessage,

    // 表格
    myActivitiesTable,
  };
}
