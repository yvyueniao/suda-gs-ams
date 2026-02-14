/**
 * ============================================
 * shared/ui
 * ============================================
 *
 * UI 交互辅助工具（不是组件库）
 *
 * 当前提供：
 * - confirmAsync：Promise 化确认弹窗
 * - notify 抽象类型 + antd 适配器
 *
 * 使用规范：
 * - 页面层或 actions 层统一从这里 import
 * - 禁止在业务代码中直接使用 Modal.confirm / message
 */

/* =========================
 * confirm
 * ========================= */

export { confirmAsync, type ConfirmAsyncOptions } from "./confirmAsync";

/* =========================
 * notify
 * ========================= */

export {
  type Notify,
  type NotifyKind,
  type NotifyPayload,
  createAntdNotify,
  noopNotify,
} from "./notify";
