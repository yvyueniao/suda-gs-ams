import { Routes, Route } from "react-router-dom";
import AppLayout from "./app/layout/AppLayout";

// pages
import HomePage from "./pages/home/HomePage";
import EnrollPage from "./pages/enroll/EnrollPage";
import ActivityAdminPage from "./pages/activity-admin/ActivityAdminPage";
import FeedbackCenterPage from "./pages/feedback-center/FeedbackCenterPage";
import FeedbackAdminPage from "./pages/feedback-admin/FeedbackAdminPage";
import ProfilePage from "./pages/profile/ProfilePage";
import RbacPage from "./pages/rbac/RbacPage";
import OrgPage from "./pages/org/OrgPage";
import AuditPage from "./pages/audit/AuditPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/enroll" element={<EnrollPage />} />
        <Route path="/activity-admin" element={<ActivityAdminPage />} />
        <Route path="/feedback-center" element={<FeedbackCenterPage />} />
        <Route path="/feedback-admin" element={<FeedbackAdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/rbac" element={<RbacPage />} />
        <Route path="/org" element={<OrgPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Route>
    </Routes>
  );
}
