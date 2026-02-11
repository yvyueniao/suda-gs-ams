// src/app/menu/menuIconMap.tsx
import type { ReactNode } from "react";
import {
  CalendarOutlined,
  FormOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CommentOutlined,
  MessageOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
  CrownOutlined,
  TeamOutlined,
  ApartmentOutlined,
  AuditOutlined,
  FileSearchOutlined,
  AppstoreOutlined,
  ToolOutlined, // ✅ 系统管理用
  SolutionOutlined, // ✅ 用户与权限用
  InboxOutlined, // ✅ 活动/讲座管理用
  IssuesCloseOutlined, // ✅ 反馈处理用
} from "@ant-design/icons";

/**
 * 后端 menuKey -> 前端 Icon（ReactNode）
 * 目标：尽量每个 key 使用不同 icon（含一级菜单 key）
 */
export const menuIconMap: Record<string, ReactNode> = {
  // ===== 一级菜单（你截图里这 8 个）=====
  apply: <FormOutlined />, // 活动/讲座报名
  feedback: <CommentOutlined />, // 反馈中心
  profile: <UserOutlined />, // 个人中心
  activity_manage: <InboxOutlined />, // ✅ 活动/讲座管理（修复）
  feedback_handle: <IssuesCloseOutlined />, // ✅ 反馈处理（修复）
  user_permission: <SolutionOutlined />, // ✅ 用户与权限（修复）
  org: <TeamOutlined />, // 组织架构
  system: <ToolOutlined />, // ✅ 系统管理（修复）

  // ===== 二级 / 叶子菜单（如果后端也会返回这些 key，就也能显示不同 icon）=====
  // 活动
  apply_list: <CalendarOutlined />,
  activity_admin: <DatabaseOutlined />,
  activity_manage_list: <SettingOutlined />,

  // 反馈
  my_feedback: <MessageOutlined />,
  feedback_admin: <FileTextOutlined />,
  feedback_handle_list: <CheckCircleOutlined />,

  // 个人
  profile_info: <IdcardOutlined />,

  // 权限
  ruser_permission: <SafetyCertificateOutlined />,
  user_manage: <UserSwitchOutlined />,
  admin_manage: <CrownOutlined />,

  // 组织
  dept_manage: <ApartmentOutlined />,

  // 审计
  audit: <AuditOutlined />,
  operation_log: <FileSearchOutlined />,
};

export function getMenuIcon(menuKey: string): ReactNode {
  return menuIconMap[menuKey] ?? <AppstoreOutlined />;
}
