// src/mock/index.ts

import type { Connect } from "vite";
import { mockConfig } from "./core/config";

// ✅ 各模块 mock
import { setupAuthMock } from "./modules/auth.mock";
import { setupProfileMock } from "./modules/profile.mock";
import { setupOrgDepartmentMock } from "./modules/orgDepartment.mock";
import { setupActivityApplyMock } from "./modules/activityApply.mock";
import { setupRbacAdminMock } from "./modules/rbacAdmin.mock";
import { setupRbacUserMock } from "./modules/rbacUser.mock"; // ⭐ 新增

export function setupMock(middlewares: Connect.Server) {
  if (!mockConfig.enabled) return;

  // ======================================================
  // 1) 鉴权 / 登录 / 菜单
  // ======================================================
  setupAuthMock(middlewares);

  // ======================================================
  // 2) 个人中心
  // ======================================================
  setupProfileMock(middlewares);

  // ======================================================
  // 3) 组织架构
  // ======================================================
  setupOrgDepartmentMock(middlewares);

  // ======================================================
  // 4) 活动报名
  // ======================================================
  setupActivityApplyMock(middlewares);

  // ======================================================
  // 5) RBAC - 管理员管理
  // ======================================================
  setupRbacAdminMock(middlewares);

  // ======================================================
  // 6) RBAC - 用户管理（⭐ 新增）
  // ======================================================
  setupRbacUserMock(middlewares);

  // 后续模块在这里注册即可（vite.config.ts 永远不动）
  // setupActivityAdminMock(middlewares);
  // setupFeedbackMock(middlewares);
  // setupAuditMock(middlewares);
}
