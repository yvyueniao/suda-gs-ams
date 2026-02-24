// src/app/telemetry/sentry.ts
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

import { setOnHttpError, setOnUnauthorized } from "../../shared/http/client";
import type { ApiError } from "../../shared/http/error";

let inited = false;

/**
 * 过滤哪些 http 错误值得上报
 */
function shouldReportHttpError(err: ApiError) {
  // 5xx
  if (err.code === "SERVER_ERROR") return true;

  // 网络问题
  if (err.code === "NETWORK_ERROR") return true;

  // 超时
  if (err.code === "TIMEOUT") return true;

  // 状态码 >= 500
  if (typeof err.status === "number" && err.status >= 500) return true;

  // 401/403/404/400 不上报（避免噪音）
  return false;
}

export function initSentry() {
  if (inited) return;
  inited = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const environment = import.meta.env.MODE;

  Sentry.init({
    dsn,
    environment,

    /**
     * 🔥 关键：release 必须和 sourcemap 上传时一致
     * 你现在 release 格式是：
     * suda-gs-ams@版本号+commitHash
     *
     * 如果后面要自动注入，可用 VITE_RELEASE 注入
     */
    release: import.meta.env.VITE_RELEASE,

    integrations: [browserTracingIntegration()],

    /**
     * 性能采样率：
     * - development：全开方便调试
     * - 生产：低采样防止数据爆炸
     */
    tracesSampleRate: environment === "development" ? 1.0 : 0.2,

    sendDefaultPii: false,
  });

  /**
   * 1️⃣ http 层错误统一上报
   */
  setOnHttpError((err) => {
    if (!shouldReportHttpError(err)) return;

    Sentry.captureException(err, {
      tags: {
        layer: "http",
        err_code: err.code,
        ...(err.status ? { http_status: String(err.status) } : {}),
        ...(err.bizCode ? { biz_code: String(err.bizCode) } : {}),
      },
    });
  });

  /**
   * 2️⃣ 401 不当异常，但记录 breadcrumb
   */
  setOnUnauthorized((reason) => {
    Sentry.addBreadcrumb({
      category: "auth",
      message: reason ?? "unauthorized",
      level: "info",
    });
  });
}

/**
 * 可选能力：
 * 在 bootstrap 成功后调用
 * Sentry.setUser(...)
 */
export function setSentryUser(user: {
  id: string | number;
  username?: string;
  role?: string | number;
}) {
  Sentry.setUser({
    id: String(user.id),
    username: user.username,
    role: user.role ? String(user.role) : undefined,
  });
}
