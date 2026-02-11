// src/shared/actions/useAsyncAction.ts

import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncActionOptions } from "./types";

/**
 * useAsyncAction
 *
 * 统一解决：
 * - loading
 * - 防重复触发
 * - ApiError 自动提示
 * - 成功提示
 * - 成功/失败回调
 */
export function useAsyncAction<T = unknown>(
  options: AsyncActionOptions<T> = {},
) {
  const {
    successMessage,
    errorMessage,
    onError,
    onSuccess,
    preventConcurrent = true,
    silentUnauthorized = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const runningRef = useRef(false);

  const run = useCallback(
    async (fn: () => Promise<T>) => {
      if (preventConcurrent && runningRef.current) return undefined;

      runningRef.current = true;
      setLoading(true);

      try {
        const result = await fn();

        // 1️⃣ 先执行 onSuccess
        let blockDefaultSuccess = false;
        if (onSuccess) {
          const r = await onSuccess(result);
          if (r === false) blockDefaultSuccess = true;
        }

        // 2️⃣ 再执行默认 successMessage
        if (!blockDefaultSuccess && successMessage) {
          if (typeof successMessage === "function") {
            const msg = successMessage(result);
            if (msg) message.success(msg);
          } else {
            message.success(successMessage);
          }
        }

        return result;
      } catch (err) {
        // 调用方优先处理
        if (onError) {
          const handled = await onError(err);
          if (handled === true) return undefined;
        }

        // 401 静默
        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          err.code === "UNAUTHORIZED"
        ) {
          return undefined;
        }

        // ApiError
        if (err instanceof ApiError) {
          message.error(err.message || errorMessage || "操作失败，请重试");
          return undefined;
        }

        // 兜底
        message.error(errorMessage || "操作失败，请重试");
        return undefined;
      } finally {
        runningRef.current = false;
        setLoading(false);
      }
    },
    [
      preventConcurrent,
      successMessage,
      errorMessage,
      onError,
      onSuccess,
      silentUnauthorized,
    ],
  );

  return { loading, run };
}
