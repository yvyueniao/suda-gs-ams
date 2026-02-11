// src/shared/actions/useAsyncAction.ts

import { useCallback, useRef, useState } from "react";
import { message } from "antd";

import { ApiError } from "../http/error";
import type { AsyncActionOptions } from "./types";

/**
 * useAsyncAction
 *
 * 定位：单个异步动作编排（不是按钮组件）
 *
 * 统一解决：
 * - loading：把“进行中”状态集中管理，按钮/Modal OK 直接绑定 loading
 * - 防重复触发：默认开启（preventConcurrent=true），避免连点造成重复提交
 * - 错误口径统一：
 *   - ApiError：优先展示后端 msg（err.message）
 *   - 非 ApiError：展示兜底 errorMessage 或默认文案
 * - 401 静默：默认开启（silentUnauthorized=true）
 *   - 你们 http 层收到 401 已经做了「清会话 + onUnauthorized 跳登录」
 *   - 这里再 toast 往往会显得多余/重复
 * - 成功提示：successMessage 支持 string / function
 * - 成功/失败回调：onSuccess / onError
 *   - onSuccess 返回 false：可阻止默认 successMessage（用于你自己 toast 或自定义提示）
 *   - onError 返回 true：表示错误已处理，不再自动 toast
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

  // ✅ 对外暴露：给 Button loading / Modal confirmLoading 用
  const [loading, setLoading] = useState(false);

  // ✅ 用 ref 做并发锁：避免闭包拿到旧 loading 导致失效
  const runningRef = useRef(false);

  /**
   * run(fn)
   *
   * 用法：action.run(() => apiCall())
   *
   * - 成功：返回 fn 的结果
   * - 失败：内部统一处理提示，返回 undefined（让页面逻辑更干净）
   */
  const run = useCallback(
    async (fn: () => Promise<T>) => {
      // 1) 防重复触发（默认开启）
      if (preventConcurrent && runningRef.current) return undefined;

      runningRef.current = true;
      setLoading(true);

      try {
        // 2) 真正执行异步动作
        const result = await fn();

        // 3) 先执行 onSuccess（因为它可能触发跳转/关闭弹窗/刷新等）
        //    如果 onSuccess 返回 false：阻止默认 successMessage
        let blockDefaultSuccess = false;
        if (onSuccess) {
          const r = await onSuccess(result);
          if (r === false) blockDefaultSuccess = true;
        }

        // 4) 再执行默认 successMessage（可固定文案或动态文案）
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
        // 5) 调用方优先处理错误
        //    - 返回 true：代表“我已处理”，这里不再 toast
        if (onError) {
          const handled = await onError(err);
          if (handled === true) return undefined;
        }

        // 6) 401 静默（兼容两种判定：code 或 status）
        //    - http 层已闭环：清 token/user + onUnauthorized 跳登录
        if (
          silentUnauthorized &&
          err instanceof ApiError &&
          (err.code === "UNAUTHORIZED" || err.status === 401)
        ) {
          return undefined;
        }

        // 7) ApiError：优先展示后端 msg（err.message）
        if (err instanceof ApiError) {
          message.error(err.message || errorMessage || "操作失败，请重试");
          return undefined;
        }

        // 8) 非 ApiError：兜底
        message.error(errorMessage || "操作失败，请重试");
        return undefined;
      } finally {
        // 9) 释放并发锁 + 结束 loading
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
