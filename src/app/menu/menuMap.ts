/**src\app\menu\menuMap.ts
 * 后端 menu key → 前端路由 path 映射
 *
 * 规则：
 * - 后端 key 来自 /menuList
 * - path 必须是 App.tsx 中真实存在的路由
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

  // ===== 活动 / 讲座管理 =====（后端是 activity_manage）
  activity_manage: "/activity-admin",
  activity_manage_list: "/activity-admin",

  // ===== 反馈处理 =====（后端是 feedback_handle）
  feedback_handle: "/feedback-admin",
  feedback_handle_list: "/feedback-admin",

  // ===== 用户与权限 =====
  user_permission: "/rbac/users",
  user_manage: "/rbac/users",
  admin_manage: "/rbac/admins",

  // ===== 组织架构 =====
  org: "/org",
  dept_manage: "/org",

  // ===== 系统管理 =====（你前端页面叫 /audit，但后端 key 是 system/operation_log）
  system: "/audit",
  operation_log: "/audit",
};

/**
 * pathname → menu key（用于 Menu 高亮）
 *
 * 建议返回“二级 key”（更稳定）
 * 因为你 MenuItem 通常是二级节点（apply_list / my_feedback ...）
 */
export function pathToMenuKey(pathname: string): string {
  if (pathname.startsWith("/enroll")) return "apply_list";
  if (pathname.startsWith("/feedback-center")) return "my_feedback";
  if (pathname.startsWith("/profile")) return "profile_info";

  if (pathname.startsWith("/activity-admin")) return "activity_manage_list";
  if (pathname.startsWith("/feedback-admin")) return "feedback_handle_list";

  if (pathname.startsWith("/rbac/users")) return "user_manage";
  if (pathname.startsWith("/rbac/admins")) return "admin_manage";
  if (pathname.startsWith("/rbac")) return "user_manage"; // /rbac 会重定向到 users

  if (pathname.startsWith("/org")) return "dept_manage";

  if (pathname.startsWith("/audit")) return "operation_log";

  return "";
}
