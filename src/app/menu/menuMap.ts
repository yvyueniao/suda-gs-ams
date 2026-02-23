/** src/app/menu/menuMap.ts
 * 后端 menu key → 前端路由 path 映射
 *
 * 规则：
 * - 后端 key 来自 /menuList
 * - path 必须是 App.tsx 中真实存在的路由
 * - 若未来新增子路由，优先保证 prefix 一致
 */
export const MENU_KEY_TO_PATH: Record<string, string> = {
  // ===== 活动 / 讲座报名 =====
  apply: "/enroll",
  apply_list: "/enroll",

  // ===== 反馈中心 =====
  feedback: "/feedback-center",
  my_feedback: "/feedback-center",

  // ===== 个人中心 =====
  profile: "/profile",
  profile_info: "/profile",

  // ===== 活动 / 讲座管理 =====
  activity_manage: "/activity-admin",
  activity_manage_list: "/activity-admin",

  // ===== 反馈处理 =====
  feedback_handle: "/feedback-admin",
  feedback_handle_list: "/feedback-admin",

  // ===== 用户与权限（RBAC）=====
  user_permission: "/rbac/users",
  user_manage: "/rbac/users",
  admin_manage: "/rbac/admins",

  // ===== 组织架构 =====
  org: "/org",
  dept_manage: "/org",

  // ===== 系统管理 =====
  system: "/audit",
  operation_log: "/audit",
};

/**
 * pathname → menu key（用于 Menu 高亮）
 *
 * 设计原则：
 * - 返回“二级 key”（更稳定）
 * - 长路径优先匹配（避免前缀冲突）
 * - RBAC 默认高亮 user_manage
 * - /feedback/detail 根据来源页区分
 */
export function pathToMenuKey(pathname: string): string {
  if (pathname.startsWith("/feedback/detail")) return "";
  // ===== 活动 / 报名 =====
  if (pathname.startsWith("/enroll")) return "apply_list";

  // ===== 反馈中心 =====
  if (pathname.startsWith("/feedback-center")) return "my_feedback";

  // ===== 个人中心 =====
  if (pathname.startsWith("/profile")) return "profile_info";

  // ===== 活动管理 =====
  if (pathname.startsWith("/activity-admin")) return "activity_manage_list";

  // ===== 反馈处理 =====
  if (pathname.startsWith("/feedback-admin")) return "feedback_handle_list";

  // ===== RBAC（注意顺序：admins 必须在 users 前面判断）=====
  if (pathname.startsWith("/rbac/admins")) return "admin_manage";
  if (pathname.startsWith("/rbac/users")) return "user_manage";

  // /rbac 根路径默认高亮用户管理
  if (pathname === "/rbac") return "user_manage";

  // ===== 组织架构 =====
  if (pathname.startsWith("/org")) return "dept_manage";

  // ===== 系统管理 =====
  if (pathname.startsWith("/audit")) return "operation_log";

  return "";
}
