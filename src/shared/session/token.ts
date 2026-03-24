//src\shared\session\token.ts
import { safeStorageGet, safeStorageRemove, safeStorageSet } from "./storage";

const TOKEN_KEY = "suda-gs-ams:token";

export function getToken(): string | null {
  return safeStorageGet(TOKEN_KEY);
}

export function setToken(token: string): void {
  safeStorageSet(TOKEN_KEY, token);
}

export function clearToken(): void {
  safeStorageRemove(TOKEN_KEY);
}
