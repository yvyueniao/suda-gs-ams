// src/shared/components/guard/Can.tsx
/**
 * Can (skeleton)
 *
 * 职责：
 * - “按钮级/组件级”的权限显隐控制
 * - 与 RequireRole（页面级守卫）配合使用：
 *   - RequireRole：决定能不能进页面
 *   - Can：决定页面内某个按钮/操作能不能显示或可用
 *
 * 当前阶段（先搭骨架）：
 * - 不做真实权限判定（因为你们权限字段/权限模型可能还在变化）
 * - 先提供一个通用的 props 结构：
 *   1) allow：布尔条件（最通用，业务侧自己算）
 *   2) fallback：无权限时渲染什么（默认不渲染）
 *
 * 未来扩展（可选）：
 * - perm: string | string[] 让它直接读取用户权限集合进行判定
 * - 从 shared/session 读取 user、role、perms
 */

import React from "react";

export type CanProps = {
  /**
   * 是否允许
   * - 推荐业务侧先计算好，再传给 Can
   * - 这样 Can 不会绑定具体权限模型（不过度工程化）
   */
  allow: boolean;

  /** 无权限时的替代渲染（默认 null） */
  fallback?: React.ReactNode;

  /** 有权限时渲染内容 */
  children: React.ReactNode;
};

export function Can(props: CanProps) {
  const { allow, fallback = null, children } = props;
  return <>{allow ? children : fallback}</>;
}
