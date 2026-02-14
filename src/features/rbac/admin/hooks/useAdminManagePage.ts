// src/features/rbac/admin/hooks/useAdminManagePage.ts

import { useCallback, useMemo, useRef, useState } from "react";

import { runConfirmedAction } from "../../../../shared/actions";
import type { Notify } from "../../../../shared/ui";

import type {
  AppointRoleFormValues,
  AppointRolePayload,
  DepartmentMemberItem,
  DepartmentOption,
  UserSuggestion,
} from "../types";

import {
  appointRole,
  deleteDepartmentMember,
  getAllDepartments,
  searchUserSuggestionsByName,
} from "../api";

import { useAdminMembersTable } from "./useAdminMembersTable";

/** ✅ 稳定的 noop，避免每次 render 产生新函数 */
const noopNotify: Notify = () => {
  // noop
};

/** 任命弹窗内部状态 */
type AppointModalState = {
  open: boolean;
  nameInput: string;
  suggestions: UserSuggestion[];
  values: Partial<AppointRoleFormValues>;
};

export function useAdminManagePage(options?: { onNotify?: Notify }) {
  /** ✅ notify 必须稳定，否则会导致 loadDepartments 等 callback 全部抖动 */
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // ======================================================
  // 1) 部门列表
  // ======================================================
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  /** ✅ 用 ref 防止并发/重复触发（比把 loadingDepartments 放依赖里更稳） */
  const deptLoadingRef = useRef(false);

  const loadDepartments = useCallback(async () => {
    if (deptLoadingRef.current) return;

    deptLoadingRef.current = true;
    setLoadingDepartments(true);

    try {
      const list = await getAllDepartments();
      setDepartments(Array.isArray(list) ? list : []);
    } catch {
      notify({ kind: "error", msg: "加载部门列表失败" });
    } finally {
      deptLoadingRef.current = false;
      setLoadingDepartments(false);
    }
  }, [notify]);

  const ensureDepartmentsLoaded = useCallback(async () => {
    if (departments.length > 0) return;
    await loadDepartments();
  }, [departments.length, loadDepartments]);

  const departmentFilters = useMemo(() => {
    return departments.map((d) => ({
      text: d.department,
      value: d.department,
    }));
  }, [departments]);

  // ======================================================
  // 2) 表格（管理员管理：部门成员列表）
  // ======================================================
  const [deletingMap, setDeletingMap] = useState<Record<string, boolean>>({});

  const isDeleting = useCallback(
    (username: string) => !!deletingMap[username],
    [deletingMap],
  );

  const { table, columns, columnPrefs, presets } = useAdminMembersTable({
    onDelete: async (record) => {
      const { confirmed } = await runConfirmedAction(
        {
          title: "确认删除该成员？",
          content: `将从部门成员中移除：${record.name}（${record.username}）`,
          okText: "删除",
          cancelText: "取消",
          danger: true,
        },
        async () => {
          setDeletingMap((m) => ({ ...m, [record.username]: true }));
          try {
            await deleteDepartmentMember({ username: record.username });
          } finally {
            setDeletingMap((m) => ({ ...m, [record.username]: false }));
          }
        },
      );

      if (!confirmed) return;

      notify({ kind: "success", msg: "已删除成员" });
      table.reload();
    },
    departmentFilters,
  });

  // ======================================================
  // 3) 任命职务（弹窗）
  // ======================================================
  const [appointModal, setAppointModal] = useState<AppointModalState>({
    open: false,
    nameInput: "",
    suggestions: [],
    values: {},
  });

  const [searchingSuggestion, setSearchingSuggestion] = useState(false);
  const searchingRef = useRef(false);

  const openAppointModal = useCallback(async () => {
    await ensureDepartmentsLoaded();
    setAppointModal({
      open: true,
      nameInput: "",
      suggestions: [],
      values: {},
    });
  }, [ensureDepartmentsLoaded]);

  const closeAppointModal = useCallback(() => {
    setAppointModal((s) => ({ ...s, open: false }));
  }, []);

  const onNameInputChange = useCallback(
    async (nameKey: string) => {
      setAppointModal((s) => ({ ...s, nameInput: nameKey }));

      const key = nameKey.trim();
      if (!key) {
        setAppointModal((s) => ({ ...s, suggestions: [] }));
        return;
      }

      // ✅ 防并发：上一次还没结束就不再发
      if (searchingRef.current) return;

      searchingRef.current = true;
      setSearchingSuggestion(true);

      try {
        const list = await searchUserSuggestionsByName({ key, pageSize: 20 });
        setAppointModal((s) => ({
          ...s,
          suggestions: Array.isArray(list) ? list : [],
        }));
      } catch {
        notify({ kind: "error", msg: "搜索用户失败" });
      } finally {
        searchingRef.current = false;
        setSearchingSuggestion(false);
      }
    },
    [notify],
  );

  const onPickSuggestion = useCallback((u: UserSuggestion) => {
    setAppointModal((s) => ({
      ...s,
      nameInput: u.name,
      suggestions: [],
      values: {
        ...s.values,
        name: u.name,
        username: u.username,
      },
    }));
  }, []);

  const [submittingAppoint, setSubmittingAppoint] = useState(false);
  const appointSubmittingRef = useRef(false);

  const submitAppoint = useCallback(
    async (values: AppointRoleFormValues) => {
      if (appointSubmittingRef.current) return;

      const payload: AppointRolePayload = {
        username: values.username,
        departmentId: values.departmentId,
        role: values.role,
      };

      appointSubmittingRef.current = true;
      setSubmittingAppoint(true);

      try {
        await appointRole(payload);
        notify({ kind: "success", msg: "任命成功" });
        closeAppointModal();
        table.reload();
      } catch {
        notify({ kind: "error", msg: "任命失败，请稍后重试" });
      } finally {
        appointSubmittingRef.current = false;
        setSubmittingAppoint(false);
      }
    },
    [closeAppointModal, notify, table],
  );

  return {
    // table
    table,
    columns,
    presets,
    columnPrefs,

    // departments
    departments,
    departmentFilters,
    loadingDepartments,
    loadDepartments,

    // delete
    isDeleting,

    // appoint modal
    appointModal,
    openAppointModal,
    closeAppointModal,
    onNameInputChange,
    onPickSuggestion,
    submittingAppoint,
    submitAppoint,

    searchingSuggestion,
  };
}
