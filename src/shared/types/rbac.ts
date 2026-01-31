/**
 * RBAC（Role-Based Access Control）类型定义
 * 仅用于描述“权限语义”，不包含任何业务实现
 */

/** 系统内的用户角色 */
export type UserRole =
  | "USER" // 普通用户
  | "STAFF" // 干事
  | "MINISTER" // 部长
  | "CHAIR" // 主席
  | "ADMIN"; // 超级管理员

/** 权限点（细粒度控制，后期可扩展） */
export type Permission =
  | "activity:read"
  | "activity:create"
  | "activity:update"
  | "activity:delete"
  | "feedback:reply"
  | "user:manage";

/** 路由 / 菜单 / 页面可访问性描述 */
export interface AccessControl {
  roles?: UserRole[];
  permissions?: Permission[];
}

/** 角色 → 权限结构描述（不包含实现） */
export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
