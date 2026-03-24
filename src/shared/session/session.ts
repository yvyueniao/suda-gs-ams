//src\shared\session\session.ts
import type { User } from "../../features/auth/types";
import { safeStorageGet, safeStorageRemove, safeStorageSet } from "./storage";

const USER_KEY = "suda-gs-ams:user";

export function getUser(): User | null {
  const raw = safeStorageGet(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  safeStorageSet(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  safeStorageRemove(USER_KEY);
}
