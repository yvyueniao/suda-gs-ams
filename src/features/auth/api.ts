import { request } from "../../shared/http/client";
import type {
  LoginData,
  LoginPayload,
  User,
  UserInfoData,
  MenuNode,
  SendVerifyCodePayload,
  ForgetPasswordPayload,
  OperationResult,
} from "./types";

/**
 * ===========================
 * 登录 & 鉴权
 * ===========================
 */

/**
 * 登录
 * POST /suda_login
 */
export function login(payload: LoginPayload) {
  return request<LoginData>({
    url: "/suda_login",
    method: "POST",
    data: payload,
  });
}

/**
 * 验证 token 是否有效
 * POST /token
 * data: User
 */
export function verifyToken() {
  return request<User>({
    url: "/token",
    method: "POST",
  });
}

/**
 * 获取当前用户信息（后端可能刷新 token）
 * POST /user/info
 * data: { user, token }
 */
export function getUserInfo() {
  return request<UserInfoData>({
    url: "/user/info",
    method: "POST",
  });
}

/**
 * 获取当前用户菜单
 * POST /menuList
 */
export function getMenuList() {
  return request<MenuNode[]>({
    url: "/menuList",
    method: "POST",
  });
}

/**
 * ===========================
 * 忘记密码（无需登录）
 * ===========================
 */

/**
 * 发送验证码
 * POST /user/send-verify-code
 * data: null
 */
export function sendVerifyCode(payload: SendVerifyCodePayload) {
  return request<null>({
    url: "/user/send-verify-code",
    method: "POST",
    data: payload,
  });
}

/**
 * 忘记密码 - 重置密码
 * POST /user/forget-password
 * data: string | null
 */
export function forgetPassword(payload: ForgetPasswordPayload) {
  return request<OperationResult>({
    url: "/user/forget-password",
    method: "POST",
    data: payload,
  });
}
