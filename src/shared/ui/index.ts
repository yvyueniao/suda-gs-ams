// src/shared/ui/index.ts

/**
 * shared/ui
 *
 * UI 交互辅助工具（不是组件库）
 *
 * 当前提供：
 * - confirmAsync：Promise 化的确认弹窗
 *
 * 使用规范：
 * - 页面层或 actions 层统一从这里 import
 * - 禁止直接在业务代码里调用 Modal.confirm
 */

export { confirmAsync, type ConfirmAsyncOptions } from "./confirmAsync";
