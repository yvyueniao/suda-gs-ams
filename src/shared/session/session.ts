import type { User } from "../../features/auth/types";

const USER_KEY = "suda-gs-ams:user";

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * 只清除用户信息（不包含 token）
 * token 由 token.ts 负责
 */
export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}
