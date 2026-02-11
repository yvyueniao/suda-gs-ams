// src/shared/actions/useAsyncMapAction.ts
import { useCallback, useMemo, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncMapActionOptions, AsyncMapActionReturn } from "./types";

type Key = string | number;

/**
 * useAsyncMapAction
 *
 * 定位：行内 / 多实例 的异步动作编排（不是按钮组件）
 *
 * 典型场景：
 * - 表格“操作列”：每一行都有【删除/通过/撤回/报名/取消】等按钮
 * - 列表“卡片流”：每个卡片都有一个【关注/取消关注】按钮
 *
 * 为什么要有它：
 * - 单个 useAsyncAction 只能提供一个 loading
 * - 行内操作需要 “按行独立 loading”，否则点 A 行按钮会导致 B 行也 loading（体验不好）
 *
 * 统一解决：
 * - loadingMap：按 key（通常是 rowKey / id）维护 loading
 * - 防重复触发：默认同 key 运行中忽略重复触发（preventConcurrentPerKey=true）
 * - ApiError 提示：优先展示后端 msg（err.message）
 * - 401 静默：默认开启（silentUnauthorized=true）
 *   - 你们 http 层收到 401 已经做了「清会话 + onUnauthorized 跳登录」
 *   - 这里再 toast 通常会显得重复/打扰
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

  /**
   * loadingMap：记录每个 key 的 loading
   *
   * - key = 行 id / rowKey
   * - value = true 表示该行正在执行中
   *
   * ✅ 用 Map 的原因：
   * - 查询/删除都方便
   * - key 不局限于 number（string/number 都行）
   */
  const [loadingMap, setLoadingMap] = useState<Map<K, boolean>>(
    () => new Map(),
  );

  /**
   * runningRef：并发锁（只用于并发控制，不用于渲染）
   *
   * 为什么还要 runningRef？
   * - setState 是异步的，连续点击可能在 state 更新前就触发多次
   * - 用 ref 可以立即生效，保证“防连点”可靠
   */
  const runningRef = useRef<Set<K>>(new Set());

  /**
   * anyLoading：是否存在任意 key 在 loading
   *
   * 用途（可选）：
   * - 当有行内操作在跑时，禁用页面上的“全局刷新/导出”等按钮
   */
  const anyLoading = useMemo(() => {
    for (const v of loadingMap.values()) if (v) return true;
    return false;
  }, [loadingMap]);

  /**
   * isLoading(key)：判断某一行是否 loading
   * - 表格里一般这样用：loading={action.isLoading(record.id)}
   */
  const isLoading = useCallback(
    (key: K) => {
      return loadingMap.get(key) === true;
    },
    [loadingMap],
  );

  /**
   * clear(key)：手动清理某个 key 的 loading
   * - 极少用（一般 finally 会自动清）
   * - 主要用于：你发现某些极端异常导致 finally 没跑到时兜底
   */
  const clear = useCallback((key: K) => {
    setLoadingMap((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    runningRef.current.delete(key);
  }, []);

  /**
   * clearAll()：清理全部 loading
   * - 同样属于兜底工具（极少用）
   */
  const clearAll = useCallback(() => {
    setLoadingMap(new Map());
    runningRef.current.clear();
  }, []);

  /**
   * setKeyLoading(key, value)
   *
   * 维护 Map 的统一入口：
   * - value=true：写入 key => true
   * - value=false：直接删除 key（让 map 保持“干净”，不会无限增长）
   */
  const setKeyLoading = useCallback((key: K, value: boolean) => {
    setLoadingMap((prev) => {
      const next = new Map(prev);
      if (value) next.set(key, true);
      else next.delete(key);
      return next;
    });
  }, []);

  /**
   * run(key, fn)
   *
   * - key：标识“哪一行/哪一条数据”
   * - fn：真正的异步动作（一般是 api 调用）
   *
   * 成功：返回 fn 的结果
   * 失败：内部统一处理提示，返回 undefined
   */
  const run = useCallback(
    async (key: K, fn: () => Promise<T>) => {
      // 1) 同 key 防重复触发（默认开启）
      if (preventConcurrentPerKey && runningRef.current.has(key)) {
        return undefined;
      }

      runningRef.current.add(key);
      setKeyLoading(key, true);

      try {
        // 2) 执行真正请求
        const result = await fn();

        // 3) 成功提示（可固定 or 动态）
        if (successMessage) {
          const text =
            typeof successMessage === "function"
              ? successMessage(key, result)
              : successMessage;
          if (text) message.success(text);
        }

        // 4) 成功回调（例如：刷新列表、更新行数据）
        if (onSuccess) await onSuccess(key, result);

        return result;
      } catch (err) {
        // 5) 调用方优先处理错误（返回 true => 已处理，不再 toast）
        const handled = await onError?.(key, err);
        if (handled === true) return undefined;

        // 6) 401 静默（兼容两种判定：code 或 status）
        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          (err.code === "UNAUTHORIZED" || err.status === 401)
        ) {
          return undefined;
        }

        // 7) ApiError：优先展示后端 msg
        if (err instanceof ApiError) {
          message.error(err.message || "操作失败，请重试");
          return undefined;
        }

        // 8) 非 ApiError：走兜底 errorMessage（可按 key 动态）
        const fallback =
          typeof errorMessage === "function"
            ? errorMessage(key)
            : errorMessage || "操作失败，请重试";
        message.error(fallback);

        return undefined;
      } finally {
        // 9) 无论成功失败，都要释放锁 + 清理 loading
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
