import type { ServerResponse } from "http";
import { mockConfig } from "./config";
import { fail, ok, sendJson } from "./http";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function withDelay() {
  const ms = rand(mockConfig.delayMs.min, mockConfig.delayMs.max);
  await new Promise((r) => setTimeout(r, ms));
}

export function maybeFail(res: ServerResponse): boolean {
  if (Math.random() < mockConfig.failRate) {
    sendJson(res, 500, fail("模拟：服务繁忙，请稍后重试", 500));
    return true;
  }
  return false;
}

/**
 * 成功但 data 为空（用于测试空态）
 * 你可以传入空值：[] / null / {}，由接口自己决定空态长什么样
 */
export function maybeEmpty<T>(
  res: ServerResponse,
  emptyData: T,
  msg = "获取成功",
): boolean {
  if (Math.random() < mockConfig.emptyRate) {
    sendJson(res, 200, ok(emptyData, msg));
    return true;
  }
  return false;
}
