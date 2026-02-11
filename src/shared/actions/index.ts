// src/shared/actions/index.ts

/**
 * shared/actions
 *
 * 异步动作编排层（不是按钮组件）
 *
 * 提供三类标准异步交互模型：
 *
 * 1️⃣ useAsyncAction
 *    - 单个异步动作
 *    - 适用于：登录、弹窗提交、页面主按钮、导出等
 *
 * 2️⃣ useAsyncMapAction
 *    - 按 key 细粒度 loading
 *    - 适用于：表格行内按钮（报名 / 取消 / 删除 / 任命 等）
 *
 * 3️⃣ useAsyncBatchAction
 *    - 批量操作编排
 *    - 适用于：批量删除 / 批量插入 / 批量处理等
 *
 * 使用规范：
 * - 业务层只负责调用 run / runBatch
 * - 不在页面重复写 try/catch/loading 模板
 * - ApiError 提示由 actions 统一处理
 */

export {
  useAsyncAction,
  type AsyncActionOptions,
  type AsyncActionResult,
} from "./useAsyncAction";

export {
  useAsyncMapAction,
  type AsyncMapActionOptions,
  type AsyncMapActionResult,
} from "./useAsyncMapAction";

export {
  useAsyncBatchAction,
  type AsyncBatchActionOptions,
  type AsyncBatchActionResult,
} from "./useAsyncBatchAction";
