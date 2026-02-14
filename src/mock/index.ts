// src/mock/index.ts

import type { Connect } from "vite";
import { mockConfig } from "./core/config";

// ✅ 只从 modules 引入各模块 mock
import { setupAuthMock } from "./modules/auth.mock";
import { setupProfileMock } from "./modules/profile.mock";
import { setupOrgDepartmentMock } from "./modules/orgDepartment.mock";
import { setupActivityApplyMock } from "./modules/activityApply.mock"; // ⭐ 新增
import { setupRbacAdminMock } from "./modules/rbacAdmin.mock";
export function setupMock(middlewares: Connect.Server) {
  if (!mockConfig.enabled) return;

  // 鉴权 / 菜单
  setupAuthMock(middlewares);

  // 个人中心
  setupProfileMock(middlewares);

  // 部门管理
  setupOrgDepartmentMock(middlewares);

  // ⭐ 活动报名模块
  setupActivityApplyMock(middlewares);

  setupRbacAdminMock(middlewares);

  // 后续模块在这里注册即可（vite.config.ts 永远不动）
  // setupActivityAdminMock(middlewares);
  // setupFeedbackMock(middlewares);
  // setupRbacMock(middlewares);
  // setupAuditMock(middlewares);
}
