// src/shared/actions/runConfirmedAction.ts

import { confirmAsync } from "../ui/confirmAsync";

/**
 * runConfirmedAction
 *
 * 文件定位：
 * - shared/actions 层（与 useAsyncAction 同级的“动作编排工具”）
 *
 * 目标：
 * - 把“危险操作二次确认 + 执行动作”抽成一个通用函数
 * - 页面层/业务层都可以用（不依赖 React，不依赖 antd message）
 *
 * 设计约束：
 * - ✅ 不做 toast：成功/失败提示由调用方决定
 * - ✅ 不做 loading：loading 由 useAsyncAction / useAsyncMapAction 管
 * - ✅ confirmAsync 作为唯一确认实现（统一风格）
 *
 * 返回：
 * - confirmed: 用户是否确认
 * - result:    动作返回值（仅 confirmed=true 时存在）
 */
export type RunConfirmedActionOptions = Parameters<typeof confirmAsync>[0];

export async function runConfirmedAction<T>(
  options: RunConfirmedActionOptions,
  action: () => Promise<T>,
): Promise<{ confirmed: boolean; result?: T }> {
  const confirmed = await confirmAsync(options);
  if (!confirmed) {
    return { confirmed: false };
  }

  const result = await action();
  return { confirmed: true, result };
}
