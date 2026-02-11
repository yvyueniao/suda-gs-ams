// src/shared/ui/confirmAsync.ts
import { Modal } from "antd";
import type { ModalFuncProps } from "antd/es/modal";

/**
 * confirmAsync
 *
 * 把 antd Modal.confirm Promise 化。
 *
 * 用途：
 * - 删除活动
 * - 批量删除
 * - 取消报名
 * - 任何危险操作二次确认
 *
 * 使用示例：
 *
 * const ok = await confirmAsync({
 *   title: "确认删除？",
 *   content: "删除后不可恢复",
 *   danger: true,
 * });
 *
 * if (!ok) return;
 * await run(...);
 */

export type ConfirmAsyncOptions = {
  title?: React.ReactNode;
  content?: React.ReactNode;

  okText?: string;
  cancelText?: string;

  /**
   * 是否危险操作（自动红色按钮）
   */
  danger?: boolean;

  /**
   * 透传给 antd Modal.confirm 的其它配置
   */
  modalProps?: Omit<ModalFuncProps, "onOk" | "onCancel">;
};

/**
 * 返回：
 * - true  → 用户点击“确定”
 * - false → 用户点击“取消”或关闭弹窗
 */
export function confirmAsync(
  options: ConfirmAsyncOptions = {},
): Promise<boolean> {
  const {
    title = "确认操作？",
    content,
    okText = "确定",
    cancelText = "取消",
    danger = false,
    modalProps,
  } = options;

  return new Promise<boolean>((resolve) => {
    const instance = Modal.confirm({
      title,
      content,
      okText,
      cancelText,
      okButtonProps: danger ? { danger: true } : undefined,

      onOk: () => {
        resolve(true);
      },

      onCancel: () => {
        resolve(false);
      },

      ...modalProps,
    });

    // 如果用户点右上角关闭（某些版本行为）
    // 确保最终 resolve(false)
    // antd confirm 已默认触发 onCancel，这里只是保险
    // @ts-ignore
    instance?.update?.({});
  });
}
