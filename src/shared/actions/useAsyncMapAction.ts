// src/shared/actions/useAsyncMapAction.ts
import { useCallback, useMemo, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncMapActionOptions, AsyncMapActionReturn } from "./types";

type Key = string | number;

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
): AsyncMapActionReturn<K, T> {
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
        const handled = await onError?.(key, err);
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
