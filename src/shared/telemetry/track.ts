/**
 * src\shared\telemetry\track.ts
 *
 * ✅ 业务级埋点统一入口（不要在业务层直接 import Sentry）
 * ✅ 支持：
 *    - breadcrumb（轻量记录，用于错误上下文）
 *    - captureMessage（关键业务事件）
 * ✅ 生产环境才真正上报（dev 只 console.debug）
 */

import * as Sentry from "@sentry/react";

export type TrackLevel = "info" | "warning" | "error";

export interface TrackPayload {
  /**
   * 业务事件名（建议 snake_case）
   * 例如：
   * - login_success
   * - apply_register_success
   * - feedback_send_fail
   */
  event: string;

  /**
   * 事件等级
   * info：正常业务流
   * warning：可恢复异常
   * error：严重业务异常
   */
  level?: TrackLevel;

  /**
   * 业务上下文数据（不要放敏感信息）
   * 例如：
   * { activityId, role, bizCode }
   */
  data?: Record<string, unknown>;

  /**
   * 是否同时作为“事件”上报（默认 false）
   * true → 会调用 captureMessage
   */
  asEvent?: boolean;
}

const isProd = import.meta.env.PROD;

/**
 * 统一业务埋点函数
 */
export function track({
  event,
  level = "info",
  data,
  asEvent = false,
}: TrackPayload) {
  // 开发环境：只打印，不上报
  if (!isProd) {
    console.debug("[track]", {
      event,
      level,
      data,
      asEvent,
    });
    return;
  }

  // 1️⃣ 记录 breadcrumb（用于错误上下文）
  Sentry.addBreadcrumb({
    category: "business",
    message: event,
    level,
    data,
  });

  // 2️⃣ 可选：主动作为业务事件上报
  if (asEvent) {
    Sentry.captureMessage(event, {
      level,
      extra: data,
      tags: {
        type: "business",
        biz_event: event,
      },
    });
  }
}
