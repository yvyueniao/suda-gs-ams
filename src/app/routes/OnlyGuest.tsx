// src/app/routes/OnlyGuest.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../../shared/session/session";

export default function OnlyGuest() {
  const user = getUser();

  // ✅ 只有本地已经有 user（说明至少成功校验/拉取过信息）才跳业务页
  if (user) {
    return <Navigate to="/enroll" replace />;
  }

  return <Outlet />;
}
