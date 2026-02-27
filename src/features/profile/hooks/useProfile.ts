// src/features/profile/hooks/useProfile.ts
/**
 * useProfile
 *
 * ✅ 文件定位
 * - 个人中心页面（ProfilePage）的“页面级编排 Hook”
 * - 只做：用户信息拉取、提交动作（改邮箱/改密码）、状态维护、错误透传、组合子 Hook（myActivitiesTable）
 * - 不做：message/toast 提示（交给页面或 shared/actions 统一处理）
 *
 * ✅ 数据流
 * 1) mount 时自动 reloadProfile() 拉取用户信息
 * 2) 页面点击“修改邮箱/修改密码” -> submitUpdateEmail/submitModifyPassword
 * 3) 表格相关能力：完全下放给 useProfileMyActivitiesTable
 *
 * ✅ 关键设计点
 * - 防并发：用 ref 锁住重复提交/重复拉取（避免连点、多次触发）
 * - 错误策略：reloadProfile 会把错误写入 profileError，并继续 throw（页面可选择 toast 或展示 Empty）
 * - 乐观更新：updateEmail 成功后本地直接更新 profile.email（避免再拉一次 profile）
 *
 * ✅ 约定（与 shared/actions 一致）
 * - 本 Hook 返回的 submit* 方法：
 *   - 成功：resolve OperationResult（通常是后端返回的 msg / 或 null）
 *   - 失败：抛出异常（ApiError 或其它），由页面决定如何提示
 *
 * ✅ 本次修改（按你的需求）
 * - 修改密码成功后：清空 token + 清空 user（让登录态立即失效）
 * - 跳转登录交给页面层做（hook 不碰路由）
 */

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

import { clearToken } from "../../../shared/session/token";
import { clearUser } from "../../../shared/session/session";

export function useProfile() {
  // =====================================================
  // 1) 用户信息：profile + loading + error
  // =====================================================
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);

  /**
   * ✅ 防并发：避免同时触发多次 getMyProfile
   * - 典型场景：页面 mount + 某些按钮又触发 reload
   */
  const loadingProfileRef = useRef(false);

  /**
   * reloadProfile
   * - 成功：更新 profile 并返回 user
   * - 失败：写入 profileError 并继续 throw（页面决定如何提示/处理）
   */
  const reloadProfile = useCallback(async () => {
    if (loadingProfileRef.current) return undefined;

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

  // mount：自动拉一次用户信息
  useEffect(() => {
    void reloadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // 2) 修改邮箱 / 修改密码：submitting + submit*
  // =====================================================
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // ✅ 防并发：避免重复提交
  const submittingEmailRef = useRef(false);
  const submittingPasswordRef = useRef(false);

  /**
   * submitUpdateEmail
   * - 成功：返回 OperationResult（一般是后端 msg 或 null）
   * - 成功后：对 profile.email 做本地乐观更新
   * - 失败：抛出异常（让页面 toast）
   */
  const submitUpdateEmail = useCallback(
    async (payload: UpdateEmailPayload): Promise<OperationResult> => {
      if (submittingEmailRef.current) return null;

      submittingEmailRef.current = true;
      setSubmittingEmail(true);

      try {
        const msg = await updateEmail(payload);

        // ✅ 乐观更新：避免再请求一次 profile
        setProfile((prev) => (prev ? { ...prev, email: payload.email } : prev));

        return msg;
      } finally {
        submittingEmailRef.current = false;
        setSubmittingEmail(false);
      }
    },
    [],
  );

  /**
   * submitModifyPassword
   * - 成功：返回 OperationResult
   * - 成功后：清空 token + user（强制重新登录）
   * - 失败：抛出异常（让页面 toast）
   */
  const submitModifyPassword = useCallback(
    async (payload: ModifyPasswordPayload): Promise<OperationResult> => {
      if (submittingPasswordRef.current) return null;

      submittingPasswordRef.current = true;
      setSubmittingPassword(true);

      try {
        const msg = await modifyPassword(payload);

        // ✅ 关键：密码修改成功 -> 强制登出
        clearToken();
        clearUser();

        return msg;
      } finally {
        submittingPasswordRef.current = false;
        setSubmittingPassword(false);
      }
    },
    [],
  );

  // =====================================================
  // 3) 错误信息：给页面 Empty 展示用（不 toast）
  // =====================================================
  const profileErrorMessage = useMemo(() => {
    if (!profileError) return "";
    if (profileError instanceof ApiError) return profileError.message;
    return "加载用户信息失败";
  }, [profileError]);

  // =====================================================
  // 4) 我的活动表格：子 Hook（完整下放）
  // =====================================================
  const myActivitiesTable = useProfileMyActivitiesTable();

  // =====================================================
  // 对外返回：页面需要的全部能力
  // =====================================================
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
