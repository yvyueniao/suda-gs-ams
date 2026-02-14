/**
 * ============================================
 * shared/actions
 * ============================================
 *
 * 异步动作体系统一出口
 *
 * 目标：
 * - 页面层 / 业务层只从这里 import
 * - 禁止深层路径引用（避免结构变动影响全局）
 *
 * 当前提供：
 * - useAsyncAction
 * - useAsyncMapAction
 * * - useAsyncBatchAction
 * - runConfirmedAction（危险操作封装）
 */

export * from "./types";

export { useAsyncAction } from "./useAsyncAction";
export { useAsyncMapAction } from "./useAsyncMapAction";
export { useAsyncBatchAction } from "./useAsyncBatchAction";

export { runConfirmedAction } from "./runConfirmedAction";
export type { RunConfirmedActionOptions } from "./runConfirmedAction";
