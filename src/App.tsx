import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./app/layout/AppLayout";
import RequireAuth from "./app/routes/RequireAuth";
import OnlyGuest from "./app/routes/OnlyGuest";
import RootRedirect from "./app/routes/RootRedirect";
import { RequireRole } from "./app/routes/RequireRole";
import { ROLES } from "./app/routes/routeAccess";

// pages
import LoginPage from "./pages/login/LoginPage";
import EnrollPage from "./pages/activity-apply/EnrollPage";
import ActivityAdminPage from "./pages/activity-admin/ActivityAdminPage";
import FeedbackCenterPage from "./pages/feedback-center/FeedbackCenterPage";
import FeedbackAdminPage from "./pages/feedback-admin/FeedbackAdminPage";
import ProfilePage from "./pages/profile/ProfilePage";
import UserManagePage from "./pages/rbac/UserManagePage";
import AdminManagePage from "./pages/rbac/AdminManagePage";
import OrgPage from "./pages/org/OrgPage";
import AuditPage from "./pages/system/AuditPage";
import ForbiddenPage from "./pages/403/ForbiddenPage";

export default function App() {
  return (
    <Routes>
      {/* 根路径：智能分流 */}
      <Route path="/" element={<RootRedirect />} />

      {/* 登录页：已登录用户禁止访问 */}
      <Route element={<OnlyGuest />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 业务区：登录态校验 */}
      <Route element={<RequireAuth />}>
        {/* Layout */}
        <Route element={<AppLayout />}>
          {/* ===== 所有登录用户可访问 ===== */}
          <Route path="/enroll" element={<EnrollPage />} />
          <Route path="/feedback-center" element={<FeedbackCenterPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* ===== 活动管理 / 反馈处理：干事及以上 ===== */}
          <Route element={<RequireRole allow={ROLES.STAFF_AND_ABOVE} />}>
            <Route path="/activity-admin" element={<ActivityAdminPage />} />
            <Route path="/feedback-admin" element={<FeedbackAdminPage />} />
          </Route>

          {/* ===== 用户与权限 / 组织架构 / 系统管理：主席 / 管理员 ===== */}
          <Route element={<RequireRole allow={ROLES.ADMIN_ONLY} />}>
            {/* RBAC：默认进用户管理 */}
            <Route
              path="/rbac"
              element={<Navigate to="/rbac/users" replace />}
            />
            <Route path="/rbac/users" element={<UserManagePage />} />
            <Route path="/rbac/admins" element={<AdminManagePage />} />

            <Route path="/org" element={<OrgPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>

          {/* 403 页面 */}
          <Route path="/403" element={<ForbiddenPage />} />

          {/* 兜底：未知业务路由 → enroll */}
          <Route path="*" element={<Navigate to="/enroll" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
