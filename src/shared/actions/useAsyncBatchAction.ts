// src/shared/actions/useAsyncBatchAction.ts
import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncBatchActionOptions, AsyncBatchActionResult } from "./types";

/**
 * useAsyncBatchAction
 *
 * 定位：批量操作按钮的异步编排（不是按钮组件）
 *
 * 适用场景：
 * - 表格“批量删除 / 批量通过 / 批量导出（走接口）”等
 *
 * 统一解决：
 * - loading
 * - 防重复触发（默认开启）
 * - 空选校验（默认开启）
 * - ApiError 自动提示（优先展示后端 msg）
 * - 401 静默（默认开启；http 层已清会话 + 跳登录）
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

  // ✅ 给“批量按钮”绑定 loading 用
  const [loading, setLoading] = useState(false);

  // ✅ 防连点/重复提交
  const runningRef = useRef(false);

  /**
   * runBatch(items, fn)
   *
   * - items：选中的 keys/id 列表（readonly，避免你误改）
   * - fn：真正的批量请求（一般是 (items)=>api(items)）
   *
   * 成功：返回接口结果
   * 失败：内部处理提示，返回 undefined
   */
  const runBatch = useCallback(
    async (
      items: readonly Item[],
      fn: (items: readonly Item[]) => Promise<Result>,
    ) => {
      // 1) 空选校验（默认开启）
      if (requireSelection && (!items || items.length === 0)) {
        message.warning(emptySelectionMessage);
        return undefined;
      }

      // 2) 防重复触发（默认开启）
      if (preventConcurrent && runningRef.current) return undefined;

      runningRef.current = true;
      setLoading(true);

      try {
        // 3) 执行真正的批量请求
        const result = await fn(items);

        // 4) 成功提示（可固定文案 or 动态文案）
        if (successMessage) {
          const text =
            typeof successMessage === "function"
              ? successMessage(items, result)
              : successMessage;
          if (text) message.success(text);
        }

        // 5) 成功回调（清 selection / reload 表格等）
        if (onSuccess) await onSuccess(items, result);

        return result;
      } catch (err) {
        // 6) 调用方优先处理错误（返回 true => 已处理，不再 toast）
        const handled = await onError?.(err);
        if (handled === true) return undefined;

        // 7) 401 静默（兼容 code 或 status）
        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          (err.code === "UNAUTHORIZED" || err.status === 401)
        ) {
          return undefined;
        }

        // 8) ApiError：优先展示后端 msg
        if (err instanceof ApiError) {
          message.error(err.message || errorMessage || "操作失败，请重试");
          return undefined;
        }

        // 9) 兜底
        message.error(errorMessage || "操作失败，请重试");
        return undefined;
      } finally {
        // 10) 释放锁 + 结束 loading
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
