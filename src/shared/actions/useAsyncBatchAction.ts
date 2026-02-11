// src/shared/actions/useAsyncBatchAction.ts
import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncBatchActionOptions, AsyncBatchActionResult } from "./types";

/**
 * useAsyncBatchAction
 *
 * 定位：批量操作按钮的异步编排（不是按钮组件）
 */
export function useAsyncBatchAction<Item = string, Result = unknown>(
  options: AsyncBatchActionOptions<Item, Result> = {},
): AsyncBatchActionResult<Item, Result> {
  const {
    requireSelection = true,
    emptySelectionMessage = "请先选择要操作的数据",
    successMessage,
    errorMessage,
    onError,
    onSuccess,
    preventConcurrent = true,
    silentUnauthorized = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const runningRef = useRef(false);

  const runBatch = useCallback(
    async (
      items: readonly Item[],
      fn: (items: readonly Item[]) => Promise<Result>,
    ) => {
      if (requireSelection && (!items || items.length === 0)) {
        message.warning(emptySelectionMessage);
        return undefined;
      }

      if (preventConcurrent && runningRef.current) return undefined;

      runningRef.current = true;
      setLoading(true);

      try {
        const result = await fn(items);

        if (successMessage) {
          const text =
            typeof successMessage === "function"
              ? successMessage(items, result)
              : successMessage;
          if (text) message.success(text);
        }

        if (onSuccess) await onSuccess(items, result);

        return result;
      } catch (err) {
        const handled = await onError?.(err);
        if (handled === true) return undefined;

        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          err.code === "UNAUTHORIZED"
        ) {
          return undefined;
        }

        if (err instanceof ApiError) {
          message.error(err.message || errorMessage || "操作失败，请重试");
          return undefined;
        }

        message.error(errorMessage || "操作失败，请重试");
        return undefined;
      } finally {
        runningRef.current = false;
        setLoading(false);
      }
    },
    [
      requireSelection,
      emptySelectionMessage,
      preventConcurrent,
      successMessage,
      errorMessage,
      onError,
      onSuccess,
      silentUnauthorized,
    ],
  );

  return { loading, runBatch };
}
