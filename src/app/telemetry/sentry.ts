// src/app/telemetry/sentry.ts
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

import { setOnHttpError, setOnUnauthorized } from "../../shared/http/client";
import type { ApiError } from "../../shared/http/error";

let inited = false;

function shouldReportHttpError(err: ApiError) {
  // ✅ 只上报“非预期/值得关注”的：
  // - 5xx
  // - 断网 / 后端挂了
  // - 超时
  if (err.code === "SERVER_ERROR") return true;
  if (err.code === "NETWORK_ERROR") return true;
  if (err.code === "TIMEOUT") return true;

  // ✅ 兜底：HTTP 状态码 >= 500
  if (typeof err.status === "number" && err.status >= 500) return true;

  // ❌ 401/403/404/400 不作为异常上报（避免噪音）
  return false;
}

export function initSentry() {
  if (inited) return;
  inited = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // ✅ 没配 DSN 就不初始化（允许某些环境关闭）
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // development / production / preview
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });

  // ✅ 1️⃣ http 层错误统一上报（带过滤）
  setOnHttpError((err) => {
    if (!shouldReportHttpError(err)) return;

    Sentry.captureException(err, {
      tags: {
        layer: "http",
        err_code: err.code,
        ...(err.status ? { status: String(err.status) } : {}),
        ...(err.bizCode ? { biz_code: String(err.bizCode) } : {}),
      },
    });
  });

  // ✅ 2️⃣ 401 不作为异常，但记录 breadcrumb
  setOnUnauthorized((reason) => {
    Sentry.addBreadcrumb({
      category: "auth",
      message: reason ?? "unauthorized",
      level: "info",
    });
  });
}
