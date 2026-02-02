import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./app/layout/AppLayout";

// pages
import EnrollPage from "./pages/activity-apply/EnrollPage";
import ActivityAdminPage from "./pages/activity-admin/ActivityAdminPage";
import FeedbackCenterPage from "./pages/feedback-center/FeedbackCenterPage";
import FeedbackAdminPage from "./pages/feedback-admin/FeedbackAdminPage";
import ProfilePage from "./pages/profile/ProfilePage";
import RbacPage from "./pages/rbac/RbacPage";
import OrgPage from "./pages/org/OrgPage";
import AuditPage from "./pages/system/AuditPage";
import LoginPage from "./pages/login/LoginPage";

export default function App() {
  return (
    <Routes>
      {/* ① Public：不需要登录 */}
      <Route path="/login" element={<LoginPage />} />

      {/* ② Protected：需要登录 + 有统一壳 */}

      <Route element={<AppLayout />}>
        {/* 登录后访问根路径，重定向到系统首页 */}
        <Route index element={<Navigate to="/enroll" replace />} />

        <Route path="enroll" element={<EnrollPage />} />
        <Route path="feedback-center" element={<FeedbackCenterPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* ③ Role：需要权限（可选再套一层） */}
        <Route path="activity-admin" element={<ActivityAdminPage />} />
        <Route path="feedback-admin" element={<FeedbackAdminPage />} />
        <Route path="rbac" element={<RbacPage />} />
        <Route path="org" element={<OrgPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>

      {/* ④ 兜底：未知路由 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
