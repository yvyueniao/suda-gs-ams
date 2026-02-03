import { request } from "../../shared/http/client";
import type {
  LoginData,
  LoginPayload,
  User,
  UserInfoData,
  MenuNode,
} from "./types";

/**
 * 登录
 * POST /login
 */
export function login(payload: LoginPayload) {
  return request<LoginData>({
    url: "/suda_login", // ✅ 修正：不是 /suda_login
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
