// src/shared/actions/useAsyncMapAction.ts
import { useCallback, useMemo, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";

type Key = string | number;

export type AsyncMapActionOptions<K extends Key, T> = {
  /**
   * 成功提示（可选）
   * - 可以是固定字符串
   * - 也可以根据 key/result 动态生成
   */
  successMessage?: string | ((key: K, result: T) => string);

  /**
   * 失败兜底提示（可选）
   * - 不传：默认 "操作失败，请重试"
   * - ApiError：优先用 err.message（后端 msg）
   */
  errorMessage?: string | ((key: K) => string);

  /**
   * 自定义错误处理：
   * - 返回 true 代表“错误已处理”，不再自动 toast
   * - 常用于：表单校验错误（err.errorFields）不提示
   */
  onError?: (key: K, err: unknown) => boolean | void;

  /**
   * 成功回调（可选）
   * - 常用于：reload 列表、刷新详情、更新行内状态等
   */
  onSuccess?: (key: K, result: T) => void | Promise<void>;

  /**
   * 是否在“同一个 key”运行中忽略重复触发（默认 true）
   * - 只锁当前行（不影响其它行操作）
   */
  preventConcurrentPerKey?: boolean;

  /**
   * 是否对 UNAUTHORIZED（401）错误静默（默认 true）
   * - 你们项目 401 已在 http 层闭环（清会话 + 跳登录）
   */
  silentUnauthorized?: boolean;
};

export type AsyncMapActionResult<K extends Key, T> = {
  /**
   * 当前是否有任意 key 在执行
   * - 可用于：禁用“全局刷新/导出”等（可选）
   */
  anyLoading: boolean;

  /**
   * 判断某个 key（通常是 rowKey）是否处于 loading
   */
  isLoading: (key: K) => boolean;

  /**
   * 执行动作：
   * - key：用于区分是哪一行/哪一条记录
   * - fn：真正的异步请求
   */
  run: (key: K, fn: () => Promise<T>) => Promise<T | undefined>;

  /**
   * 可选：清空某个 key 的 loading（极少用，主要用于异常场景兜底）
   */
  clear: (key: K) => void;

  /**
   * 可选：清空全部 loading（极少用）
   */
  clearAll: () => void;
};

/**
 * useAsyncMapAction
 *
 * 定位：行内/多实例异步动作编排（不是按钮组件）
 * 适用：表格行内按钮（报名/取消/删除/任命等）
 *
 * 特性：
 * - loading 按 key 细粒度维护（只锁当前行）
 * - 同 key 防重复触发（默认开启）
 * - ApiError：展示后端 msg
 * - 401 默认静默（跳登录已由 http 层处理）
 */
export function useAsyncMapAction<K extends Key = number, T = unknown>(
  options: AsyncMapActionOptions<K, T> = {},
): AsyncMapActionResult<K, T> {
  const {
    successMessage,
    errorMessage,
    onError,
    onSuccess,
    preventConcurrentPerKey = true,
    silentUnauthorized = true,
  } = options;

  // 用 Map 存每个 key 的 loading
  const [loadingMap, setLoadingMap] = useState<Map<K, boolean>>(
    () => new Map(),
  );

  // 防止闭包旧值：运行中标记放到 ref（只用于并发控制）
  const runningRef = useRef<Set<K>>(new Set());

  const anyLoading = useMemo(() => {
    for (const v of loadingMap.values()) if (v) return true;
    return false;
  }, [loadingMap]);

  const isLoading = useCallback(
    (key: K) => {
      return loadingMap.get(key) === true;
    },
    [loadingMap],
  );

  const clear = useCallback((key: K) => {
    setLoadingMap((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    runningRef.current.delete(key);
  }, []);

  const clearAll = useCallback(() => {
    setLoadingMap(new Map());
    runningRef.current.clear();
  }, []);

  const setKeyLoading = useCallback((key: K, value: boolean) => {
    setLoadingMap((prev) => {
      const next = new Map(prev);
      if (value) next.set(key, true);
      else next.delete(key); // false 直接删，保持 map 干净
      return next;
    });
  }, []);

  const run = useCallback(
    async (key: K, fn: () => Promise<T>) => {
      if (preventConcurrentPerKey && runningRef.current.has(key)) {
        return undefined;
      }

      runningRef.current.add(key);
      setKeyLoading(key, true);

      try {
        const result = await fn();

        if (successMessage) {
          const text =
            typeof successMessage === "function"
              ? successMessage(key, result)
              : successMessage;
          if (text) message.success(text);
        }

        if (onSuccess) await onSuccess(key, result);

        return result;
      } catch (err) {
        const handled = onError?.(key, err);
        if (handled === true) return undefined;

        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          err.code === "UNAUTHORIZED"
        ) {
          return undefined;
        }

        if (err instanceof ApiError) {
          message.error(err.message || "操作失败，请重试");
          return undefined;
        }

        const fallback =
          typeof errorMessage === "function"
            ? errorMessage(key)
            : errorMessage || "操作失败，请重试";
        message.error(fallback);

        return undefined;
      } finally {
        runningRef.current.delete(key);
        setKeyLoading(key, false);
      }
    },
    [
      preventConcurrentPerKey,
      setKeyLoading,
      successMessage,
      errorMessage,
      onError,
      onSuccess,
      silentUnauthorized,
    ],
  );

  return {
    anyLoading,
    isLoading,
    run,
    clear,
    clearAll,
  };
}
