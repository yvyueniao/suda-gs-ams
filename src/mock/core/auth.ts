import type { Connect } from "vite";
import type { ServerResponse } from "http";
import { fail, sendJson } from "./http";

// 这里先用一个“内存 token”，够用；
// 后续可以升级成 tokenSet / map / 过期时间
export const MOCK_TOKEN = "mock-jwt-token-2026-02-01";

/**
 * mock 鉴权工具
 * - 校验 Authorization header
 * - 失败时直接返回 401
 * - 成功返回 true，调用方继续处理
 */
export function requireAuth(
  req: Connect.IncomingMessage,
  res: ServerResponse,
): boolean {
  const auth = req.headers.authorization;

  if (auth !== MOCK_TOKEN) {
    sendJson(res, 401, fail("token 无效或已过期", 401));
    return false;
  }

  return true;
}
