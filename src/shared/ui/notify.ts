// src/shared/ui/notify.ts

/**
 * ============================================
 * shared/ui/notify
 * ============================================
 *
 * 目标：
 * - 抽象“非侵入式提示”类型（success / error / info）
 * - 避免在各个 hook / 业务层直接 import antd message
 * - 页面层决定“如何展示提示”
 *
 * 设计原则：
 * 1) shared 层不依赖业务
 * 2) 不强绑定 antd（只提供一个适配函数）
 * 3) 所有 features 统一使用 Notify 类型
 */

/**
 * 提示类型
 */
export type NotifyKind = "success" | "error" | "info";

/**
 * 提示 payload
 */
export type NotifyPayload = {
  kind: NotifyKind;
  msg: string;
};

/**
 * 通用 Notify 函数签名
 *
 * 使用场景：
 * - useApplyFlow
 * - useEnrollPage
 * - useDepartmentManage
 * - 任意业务 hook
 */
export type Notify = (payload: NotifyPayload) => void;

/* =====================================================
 * antd 适配器（可选）
 * ===================================================== */

/**
 * createAntdNotify
 *
 * 把 antd message 实例适配为 Notify。
 *
 * 用法示例（页面层）：
 *
 * import { message } from "antd";
 * import { createAntdNotify } from "@/shared/ui/notify";
 *
 * const notify = createAntdNotify(message);
 *
 * <Page useXXX({ onNotify: notify }) />
 */
export function createAntdNotify(messageApi: {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}): Notify {
  return ({ kind, msg }: NotifyPayload) => {
    switch (kind) {
      case "success":
        messageApi.success(msg);
        break;
      case "error":
        messageApi.error(msg);
        break;
      case "info":
      default:
        messageApi.info(msg);
        break;
    }
  };
}

/* =====================================================
 * noop 实现（可选）
 * ===================================================== */

/**
 * noopNotify
 *
 * 某些场景不想展示提示时使用：
 *
 * useApplyFlow({ onNotify: noopNotify })
 */
export const noopNotify: Notify = () => {
  // intentionally empty
};
