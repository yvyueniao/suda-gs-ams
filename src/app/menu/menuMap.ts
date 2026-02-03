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

  // ⚠️ 下面这些目前【不在 menuList 返回中】
  // 如果将来后端加菜单，只需要在这里补映射即可
  activity_admin: "/activity-admin",
  feedback_admin: "/feedback-admin",
  rbac: "/rbac",
  org: "/org",
  audit: "/audit",
};

/**
 * 前端路由 pathname → menu key（用于 Menu 高亮）
 *
 * 用途：
 * - Menu.selectedKeys
 * - 保证刷新 / 手输 URL 时，左侧菜单能正确高亮
 */
export function pathToMenuKey(pathname: string): string {
  if (pathname.startsWith("/enroll")) return "apply";
  if (pathname.startsWith("/feedback-center")) return "feedback";
  if (pathname.startsWith("/feedback-admin")) return "feedback";
  if (pathname.startsWith("/profile")) return "profile";

  // 这些目前没有后端菜单对应，可不高亮
  if (pathname.startsWith("/activity-admin")) return "";
  if (pathname.startsWith("/rbac")) return "";
  if (pathname.startsWith("/org")) return "";
  if (pathname.startsWith("/audit")) return "";

  return "";
}
