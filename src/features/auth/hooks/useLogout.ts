// src/features/auth/hooks/useLogout.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { clearToken } from "../../../shared/session/token";
import { clearUser } from "../../../shared/session/session";

/**
 * useLogout (Pure)
 *
 * ✅ 只负责退出流程：清理会话 + 跳转
 * ❌ 不弹 Modal.confirm
 * ❌ 不做 message/toast
 *
 * 让调用方决定：
 * - 是否需要确认（confirmAsync）
 * - 成功/失败提示（useAsyncAction）
 */
export function useLogout() {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    clearToken();
    clearUser();
    navigate("/login", { replace: true });
  }, [navigate]);

  return { logout };
}
