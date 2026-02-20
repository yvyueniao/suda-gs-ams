// src/mock/index.ts

import type { Connect } from "vite";
import { mockConfig } from "./core/config";

// ======================================================
// 各模块 mock
// ======================================================

import { setupAuthMock } from "./modules/auth.mock";
import { setupProfileMock } from "./modules/profile.mock";
import { setupOrgDepartmentMock } from "./modules/orgDepartment.mock";
import { setupActivityApplyMock } from "./modules/activityApply.mock";
import { setupActivityAdminMock } from "./modules/activityAdmin.mock";
import { setupActivityApplicationsMock } from "./modules/activityApplications.mock"; // ⭐ 新增（详情页三列表）
import { setupRbacAdminMock } from "./modules/rbacAdmin.mock";
import { setupRbacUserMock } from "./modules/rbacUser.mock";

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
  // 5) 活动管理（列表 + 详情）
  // ======================================================
  setupActivityAdminMock(middlewares);

  // ======================================================
  // 6) 活动管理 · 详情页三列表（⭐ 新增）
  // - /activity/activityRegisters
  // - /activity/activityCandidates
  // - /activity/activitySupplements
  // - /activity/examineSupplement
  // ======================================================
  setupActivityApplicationsMock(middlewares);

  // ======================================================
  // 4) 活动报名（学生侧）
  // ======================================================
  setupActivityApplyMock(middlewares);

  // ======================================================
  // 7) RBAC - 管理员管理
  // ======================================================
  setupRbacAdminMock(middlewares);

  // ======================================================
  // 8) RBAC - 用户管理
  // ======================================================
  setupRbacUserMock(middlewares);

  // ======================================================
  // 后续模块在这里注册即可（vite.config.ts 永远不动）
  // ======================================================
  // setupFeedbackMock(middlewares);
  // setupAuditMock(middlewares);
}
