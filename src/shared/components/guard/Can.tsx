// src/shared/components/guard/Can.tsx

/**
 * Can (按钮级权限控制)
 *
 * 职责：
 * - 根据当前登录用户的 role 决定是否渲染子节点
 *
 * 设计原则：
 * - 只控制 UI 渲染
 * - 不做接口权限校验（真正权限必须后端控制）
 * - 页面级权限请使用 RequireRole
 *
 * 使用示例：
 *
 * <Can roles={[0,1,2]}>
 *   <Button>新建</Button>
 * </Can>
 *
 * <Can roles={[0]} fallback={<span>-</span>}>
 *   <Button danger>删除</Button>
 * </Can>
 */

import React from "react";
import { getUser } from "../../session/session";

type Role = 0 | 1 | 2 | 3 | 4;

export type CanProps = {
  /**
   * 允许的角色列表
   */
  roles: Role[];

  /**
   * 不满足权限时渲染的内容
   * 默认：null
   */
  fallback?: React.ReactNode;

  /**
   * 控制模式：
   * - "hide"（默认）：直接不渲染
   * - "disable"：克隆子节点并添加 disabled
   */
  mode?: "hide" | "disable";

  children: React.ReactNode;
};

export function Can({
  roles,
  fallback = null,
  mode = "hide",
  children,
}: CanProps) {
  const user = getUser();

  if (!user) {
    return <>{fallback}</>;
  }

  const hasPermission = roles.includes(user.role as Role);

  if (hasPermission) {
    return <>{children}</>;
  }

  // 无权限
  if (mode === "disable") {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        disabled: true,
      });
    }
    return <>{fallback}</>;
  }

  return <>{fallback}</>;
}
