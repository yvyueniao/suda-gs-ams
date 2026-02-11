// src/shared/actions/useAsyncAction.ts
import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";

export type AsyncActionOptions<T> = {
  /**
   * 成功提示（可选）
   * - 不传：不自动 toast
   */
  successMessage?: string;

  /**
   * 失败兜底提示（可选）
   * - 不传：默认 "操作失败，请重试"
   * - ApiError：优先用 err.message（后端 msg）
   */
  errorMessage?: string;

  /**
   * 自定义错误处理：
   * - 返回 true 代表“错误已处理”，useAsyncAction 不再自动 toast
   * - 常用于：表单校验错误（err.errorFields）不提示
   */
  onError?: (err: unknown) => boolean | void;

  /**
   * 成功回调（可选）
   * - 常用于：跳转 / 关闭弹窗 / 刷新列表
   */
  onSuccess?: (result: T) => void | Promise<void>;

  /**
   * 是否在运行中忽略重复触发（默认 true）
   * - true：按钮连点只会触发一次
   * - false：允许并发（一般不建议）
   */
  preventConcurrent?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）错误静默（默认 true）
   * - 你们项目 401 已经在 http 层完成：清会话 + 触发 setOnUnauthorized 跳登录
   * - 这里再 toast 往往会显得“多余”
   */
  silentUnauthorized?: boolean;
};

export type AsyncActionResult<T> = {
  loading: boolean;
  /**
   * 执行异步动作：
   * - 正常返回 fn 的结果
   * - 发生错误：返回 undefined（错误已在内部处理/提示）
   */
  run: (fn: () => Promise<T>) => Promise<T | undefined>;
};

/**
 * useAsyncAction
 *
 * 定位：异步动作编排（不是按钮组件）
 * 统一解决：
 * - loading 状态
 * - 防重复触发（默认开启）
 * - ApiError 提示（后端 msg）
 * - 兜底错误提示
 * - 成功回调（跳转/关闭弹窗/刷新）
 */
export function useAsyncAction<T = unknown>(
  options: AsyncActionOptions<T> = {},
): AsyncActionResult<T> {
  const {
    successMessage,
    errorMessage,
    onError,
    onSuccess,
    preventConcurrent = true,
    silentUnauthorized = true,
  } = options;

  const [loading, setLoading] = useState(false);

  // 防止并发：用 ref 避免闭包拿到旧 loading
  const runningRef = useRef(false);

  const run = useCallback(
    async (fn: () => Promise<T>) => {
      if (preventConcurrent && runningRef.current) return undefined;

      runningRef.current = true;
      setLoading(true);

      try {
        const result = await fn();

        if (successMessage) message.success(successMessage);
        if (onSuccess) await onSuccess(result);

        return result;
      } catch (err) {
        // 交给调用方优先处理
        const handled = onError?.(err);
        if (handled === true) return undefined;

        // 401：通常已由 http 层闭环（清会话 + 跳登录），这里默认不再额外 toast
        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          err.code === "UNAUTHORIZED"
        ) {
          return undefined;
        }

        // 业务失败：直接展示后端 msg（ApiError.message）
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
