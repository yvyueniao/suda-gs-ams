// src/shared/actions/useAsyncBatchAction.ts
import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";

export type AsyncBatchActionOptions<Item, Result> = {
  /**
   * 空选校验（默认 true）
   * - items 为空时：直接提示并返回，不触发请求
   */
  requireSelection?: boolean;

  /**
   * 空选提示文案（默认 "请先选择要操作的数据"）
   */
  emptySelectionMessage?: string;

  /**
   * 成功提示（可选）
   * - string：固定文案
   * - function：可以基于 items/result 动态生成（例如 "成功删除 N 条"）
   */
  successMessage?:
    | string
    | ((items: readonly Item[], result: Result) => string);

  /**
   * 失败兜底提示（可选）
   * - ApiError：优先展示 err.message（后端 msg）
   */
  errorMessage?: string;

  /**
   * 自定义错误处理：
   * - 返回 true：代表“错误已处理”，不再自动 toast
   */
  onError?: (err: unknown) => boolean | void;

  /**
   * 成功回调（可选）
   * - 常用于：清空 selection、reload 表格等
   */
  onSuccess?: (items: readonly Item[], result: Result) => void | Promise<void>;

  /**
   * 是否忽略运行中重复触发（默认 true）
   */
  preventConcurrent?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）错误静默（默认 true）
   * - 你们项目 401 已在 http 层闭环（清会话 + 跳登录）
   */
  silentUnauthorized?: boolean;
};

export type AsyncBatchActionResult<Item, Result> = {
  loading: boolean;

  /**
   * 执行批量动作：
   * - items：通常是 selectedRowKeys / username[] / id[]
   * - fn：真正的异步请求（一般收 items 参数）
   */
  runBatch: (
    items: readonly Item[],
    fn: (items: readonly Item[]) => Promise<Result>,
  ) => Promise<Result | undefined>;
};

/**
 * useAsyncBatchAction
 *
 * 定位：批量操作按钮的异步编排（不是按钮组件）
 * 适用：
 * - 批量删除（/user/batchDelete）
 * - 批量插入（/user/batchInsertUser）
 * - 其它批量类接口
 *
 * 统一解决：
 * - loading + 防重复触发
 * - 空选校验（可关）
 * - ApiError：展示后端 msg
 * - 成功回调（清选择/刷新）
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
        const handled = onError?.(err);
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
