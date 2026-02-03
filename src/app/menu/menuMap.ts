/**
 * 后端 menu key → 前端路由 path 映射
 *
 * 说明：
 * - key 来自后端 /menuList
 * - value 必须是你 App.tsx 中真实存在的路由
 */
export const MENU_KEY_TO_PATH: Record<string, string> = {
  // ===== 活动 / 讲座 =====
  apply: "/enroll",
  apply_list: "/enroll",

  // ===== 反馈中心 =====
  feedback: "/feedback-center",
  my_feedback: "/feedback-center",

  // ===== 个人中心 =====
  profile: "/profile",
  profile_info: "/profile",

  activity_admin: "/activity-admin",
  activity_manage_list: "/activity-admin",

  feedback_admin: "/feedback-admin",
  feedback_handle_list: "/feedback-admin",

  ruser_permission: "/rbac/users",
  user_manage: "/rbac/users",
  admin_manage: "/rbac/admins",

  org: "/org",
  dept_manage: "/org",

  audit: "/audit",
  operation_log: "/audit",
};

/**
 * 前端路由 pathname → menu key（用于 Menu 高亮）
 *
 * 用途：
 * - Menu.selectedKeys
 * - 保证刷新 / 手输 URL 时，左侧菜单能正确高亮
 */
export function pathToMenuKey(pathname: string): string {
  if (pathname.startsWith("/enroll")) return "apply_list";
  if (pathname.startsWith("/feedback-center")) return "my_feedback";
  if (pathname.startsWith("/feedback-admin")) return "feedback_handle_list";
  if (pathname.startsWith("/profile")) return "profile_info";
  if (pathname.startsWith("/activity-admin")) return "activity_manage_list";
  if (pathname.startsWith("/rbac")) return "user_permission";
  if (pathname.startsWith("/org")) return "dept_manage";
  if (pathname.startsWith("/rbac")) return "rbac";
  if (pathname.startsWith("/audit")) return "operation_log";

  return "";
}
