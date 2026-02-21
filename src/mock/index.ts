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
import { setupActivityApplicationsMock } from "./modules/activityApplications.mock"; // ⭐ 详情页三列表
import { setupRbacAdminMock } from "./modules/rbacAdmin.mock";
import { setupRbacUserMock } from "./modules/rbacUser.mock";
import { setupFeedbackMock } from "./modules/feedback.mock"; // ⭐ 新增：反馈中心

export function setupMock(middlewares: Connect.Server) {
  if (!mockConfig.enabled) return;

  // ======================================================
  // 1) 鉴权 / 登录 / 菜单
  // ======================================================
  setupAuthMock(middlewares);

  // ======================================================
  // 7) 反馈中心（⭐ 新增）
  // - /session/myFeedbacks
  // - /session/allFeedback
  // - /session/createFeedback
  // - /session/close
  // - /session/content
  // - /activity/upload
  // ======================================================
  setupFeedbackMock(middlewares);

  // ======================================================
  // 2) 个人中心
  // ======================================================
  setupProfileMock(middlewares);

  // ======================================================
  // 3) 组织架构
  // ======================================================
  setupOrgDepartmentMock(middlewares);

  // ======================================================
  // 4) 活动报名（学生侧）
  // ======================================================
  setupActivityApplyMock(middlewares);

  // ======================================================
  // 5) 活动管理（列表 + 详情）
  // ======================================================
  setupActivityAdminMock(middlewares);

  // ======================================================
  // 6) 活动管理 · 详情页三列表
  // - /activity/activityRegisters
  // - /activity/activityCandidates
  // - /activity/activitySupplements
  // - /activity/examineSupplement
  // ======================================================
  setupActivityApplicationsMock(middlewares);

  // ======================================================
  // 8) RBAC - 管理员管理
  // ======================================================
  setupRbacAdminMock(middlewares);

  // ======================================================
  // 9) RBAC - 用户管理
  // ======================================================
  setupRbacUserMock(middlewares);

  // ======================================================
  // 后续模块在这里注册即可（vite.config.ts 永远不动）
  // ======================================================
  // setupAuditMock(middlewares);
}
