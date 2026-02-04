// src/app/routes/routeAccess.ts
/**
 * 页面级权限：路由访问控制表
 *
 * 说明：
 * - 你当前采用 role-based（后端返回 user.role）
 * - 页面级只负责：能不能进入某个页面（Route Guard）
 * - 细粒度（按钮/组件级）不要写在这里，放到具体页面里（如 ActivityAdmin）
 */

export type Role = 0 | 1 | 2 | 3 | 4;

/** 常用角色集合 */
export const ROLES = {
  /** 所有登录用户 */
  AUThed_ALL: [0, 1, 2, 3, 4] as const,

  /** 干事及以上（能进入“管理端活动/反馈处理”） */
  STAFF_AND_ABOVE: [0, 1, 2, 3] as const,

  /** 主席/管理员（系统级管理模块） */
  ADMIN_ONLY: [0, 1] as const,
} satisfies Record<string, readonly Role[]>;

/**
 * 路由级访问控制表（path -> allow roles）
 *
 * 说明：
 * - path 必须和 App.tsx 里 Route 的 path 对齐
 * - 如果某个 path 不在表里，默认由 RequireAuth 控制（仅要求登录）
 */
export const ROUTE_ALLOW_ROLES: Record<string, readonly Role[]> = {
  // ===== 所有登录用户可访问 =====
  "/enroll": ROLES.AUThed_ALL,
  "/feedback-center": ROLES.AUThed_ALL,
  "/profile": ROLES.AUThed_ALL,

  // ===== 管理端（干事及以上） =====
  "/activity-admin": ROLES.STAFF_AND_ABOVE,
  "/feedback-admin": ROLES.STAFF_AND_ABOVE,

  // ===== 系统级（主席/管理员） =====
  "/rbac": ROLES.ADMIN_ONLY,
  "/rbac/users": ROLES.ADMIN_ONLY,
  "/rbac/admins": ROLES.ADMIN_ONLY,
  "/org": ROLES.ADMIN_ONLY,
  "/audit": ROLES.ADMIN_ONLY,

  // ===== 403 页面本身：只要登录就能看（也可以不限制） =====
  "/403": ROLES.AUThed_ALL,
};

/**
 * 可选：根据 pathname 找到对应的 allow roles（支持前缀匹配）
 *
 * 用法（可选）：
 * const allow = getAllowRolesByPath(location.pathname)
 */
export function getAllowRolesByPath(pathname: string): readonly Role[] | null {
  // 优先精确匹配
  if (ROUTE_ALLOW_ROLES[pathname]) return ROUTE_ALLOW_ROLES[pathname];

  // 前缀匹配：比如 /rbac/users/123 这种未来可能的详情页
  const entries = Object.entries(ROUTE_ALLOW_ROLES);
  // 长前缀优先（更具体）
  entries.sort((a, b) => b[0].length - a[0].length);

  for (const [pathPrefix, allow] of entries) {
    if (pathname.startsWith(pathPrefix)) return allow;
  }

  return null;
}
