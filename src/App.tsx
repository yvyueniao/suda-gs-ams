import { Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./app/layout/AppLayout";
import RequireAuth from "./app/routes/RequireAuth";
import OnlyGuest from "./app/routes/OnlyGuest";
import RootRedirect from "./app/routes/RootRedirect";

// pages
import LoginPage from "./pages/login/LoginPage";
import EnrollPage from "./pages/activity-apply/EnrollPage";
import ActivityAdminPage from "./pages/activity-admin/ActivityAdminPage";
import FeedbackCenterPage from "./pages/feedback-center/FeedbackCenterPage";
import FeedbackAdminPage from "./pages/feedback-admin/FeedbackAdminPage";
import ProfilePage from "./pages/profile/ProfilePage";
import RbacPage from "./pages/rbac/RbacPage";
import OrgPage from "./pages/org/OrgPage";
import AuditPage from "./pages/system/AuditPage";

export default function App() {
  return (
    <Routes>
      {/* 根路径：智能分流 */}
      <Route path="/" element={<RootRedirect />} />

      {/* 登录页：已登录用户禁止访问 */}
      <Route element={<OnlyGuest />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 业务区：鉴权 + Layout */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/enroll" element={<EnrollPage />} />
          <Route path="/activity-admin" element={<ActivityAdminPage />} />
          <Route path="/feedback-center" element={<FeedbackCenterPage />} />
          <Route path="/feedback-admin" element={<FeedbackAdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/rbac" element={<RbacPage />} />
          <Route path="/org" element={<OrgPage />} />
          <Route path="/audit" element={<AuditPage />} />

          {/* 兜底：未知业务路由 → enroll */}
          <Route path="*" element={<Navigate to="/enroll" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
