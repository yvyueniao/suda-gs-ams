// src/mock/index.ts
import type { Connect } from "vite";
import { mockConfig } from "./core/config";

// ✅ 只从 modules 引入各模块 mock
import { setupAuthMock } from "./modules/auth.mock";
import { setupProfileMock } from "./modules/profile.mock";
import { setupOrgDepartmentMock } from "./modules/orgDepartment.mock";

export function setupMock(middlewares: Connect.Server) {
  if (!mockConfig.enabled) return;

  setupAuthMock(middlewares);
  setupProfileMock(middlewares);

  // ✅ 部门管理 mock
  setupOrgDepartmentMock(middlewares);

  // 后续模块在这里注册即可（vite.config.ts 永远不动）
  // setupActivityMock(middlewares);
  // setupFeedbackMock(middlewares);
  // setupRbacMock(middlewares);
  // setupAuditMock(middlewares);
}
