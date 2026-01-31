import type { User } from "../../features/auth/model";

const USER_KEY = "suda-gs-ams:user";

/** 获取当前用户 */
export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** 保存当前用户 */
export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 清除会话（退出登录） */
export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
}
