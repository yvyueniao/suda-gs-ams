// src/App.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./app/layout/AppLayout";
import RequireAuth from "./app/routes/RequireAuth";
import OnlyGuest from "./app/routes/OnlyGuest";
import RootRedirect from "./app/routes/RootRedirect";
import { RequireRole } from "./app/routes/RequireRole";
import { ROLES } from "./app/routes/routeAccess";
import RouteLoading from "./app/routes/RouteLoading";

const NOT_FOUND_PATH = "/404";
const SERVER_ERROR_PATH = "/500";

/**
 * ✅ 页面改为懒加载（路由分包关键）
 * - 普通端和管理端页面会自动拆分成独立 chunk
 * - 只有真正访问时才会下载对应 JS
 */

// public
const LoginPage = lazy(() => import("./pages/login/LoginPage"));
const EnrollPage = lazy(() => import("./pages/activity-apply/EnrollPage"));
const ActivityDetailPage = lazy(
  () => import("./pages/activity-apply/ActivityDetailPage"),
);

const FeedbackCenterPage = lazy(
  () => import("./pages/feedback-center/FeedbackCenterPage"),
);
const FeedbackDetailPage = lazy(
  () => import("./pages/feedback/FeedbackDetailPage"),
);

const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));

// admin / staff
const ActivityAdminPage = lazy(
  () => import("./pages/activity-admin/ActivityAdminPage"),
);
const ActivityAdminDetailPage = lazy(
  () => import("./pages/activity-admin/ActivityAdminDetailPage"),
);
const FeedbackAdminPage = lazy(
  () => import("./pages/feedback-admin/FeedbackAdminPage"),
);

const UserManagePage = lazy(() => import("./pages/rbac/user/UserManagePage"));
const AdminManagePage = lazy(
  () => import("./pages/rbac/admin/AdminManagePage"),
);
const OrgPage = lazy(() => import("./pages/org/OrgPage"));
const AuditPage = lazy(() => import("./pages/system/AuditPage"));

// error
const ForbiddenPage = lazy(() => import("./pages/403/ForbiddenPage"));
const NotFoundPage = lazy(() => import("./pages/error/NotFoundPage"));
const ServerErrorPage = lazy(() => import("./pages/error/ServerErrorPage"));

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* 根路径：智能分流 */}
        <Route path="/" element={<RootRedirect />} />

        {/* 显式 404 */}
        <Route path={NOT_FOUND_PATH} element={<NotFoundPage />} />

        {/* 显式 500 */}
        <Route path={SERVER_ERROR_PATH} element={<ServerErrorPage />} />

        {/* 登录页：只允许游客访问 */}
        <Route element={<OnlyGuest />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* 业务区：登录态校验 */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {/* ===== 所有登录用户可访问 ===== */}
            <Route path="/enroll" element={<EnrollPage />} />

            <Route
              path="/activity-apply/detail/:id"
              element={<ActivityDetailPage />}
            />

            <Route path="/feedback-center" element={<FeedbackCenterPage />} />

            <Route
              path="/feedback/detail/:sessionId"
              element={<FeedbackDetailPage />}
            />

            <Route path="/profile" element={<ProfilePage />} />

            {/* ===== 干事及以上 ===== */}
            <Route element={<RequireRole allow={ROLES.STAFF_AND_ABOVE} />}>
              <Route path="/activity-admin" element={<ActivityAdminPage />} />
              <Route
                path="/activity-admin/detail/:id"
                element={<ActivityAdminDetailPage />}
              />
              <Route path="/feedback-admin" element={<FeedbackAdminPage />} />
            </Route>

            {/* ===== 主席/管理员 ===== */}
            <Route element={<RequireRole allow={ROLES.ADMIN_ONLY} />}>
              <Route
                path="/rbac"
                element={<Navigate to="/rbac/users" replace />}
              />
              <Route path="/rbac/users" element={<UserManagePage />} />
              <Route path="/rbac/admins" element={<AdminManagePage />} />
              <Route path="/org" element={<OrgPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Route>

            {/* 403 */}
            <Route path="/403" element={<ForbiddenPage />} />

            {/* 业务区兜底 */}
            <Route
              path="*"
              element={<Navigate to={NOT_FOUND_PATH} replace />}
            />
          </Route>
        </Route>

        {/* 全局兜底 */}
        <Route path="*" element={<Navigate to={NOT_FOUND_PATH} replace />} />
      </Routes>
    </Suspense>
  );
}
