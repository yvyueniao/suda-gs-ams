// src/features/rbac/admin/hooks/useAdminManagePage.ts

import { useCallback, useMemo, useRef, useState } from "react";

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

/**
 * 任命弹窗内部状态
 * ✅ 改造点：
 * - nameInput / usernameInput 不再分别维护
 * - 改为 sharedSearchKey：姓名/学号两个下拉共用一个搜索输入（Search）
 * - values 仍作为“回填到表单”的桥梁（name/username 必须强一致）
 */
type AppointModalState = {
  open: boolean;

  /** ✅ 两个下拉共用的搜索关键字（可输入姓名/学号） */
  sharedSearchKey: string;

  /** ✅ 当前搜索返回的候选（姓名+学号都有） */
  suggestions: UserSuggestion[];

  /** ✅ 当前已选择的用户（唯一真相源，用于强一致） */
  selectedUser: UserSuggestion | null;

  /** ✅ 回填到表单的值（始终与 selectedUser 一致） */
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
    /**
     * ✅ 关键修复：这里不要再 runConfirmedAction 了
     * 因为 ActionCell 已经通过 confirm 弹过一次确认
     */
    onDelete: async (record: DepartmentMemberItem) => {
      setDeletingMap((m) => ({ ...m, [record.username]: true }));

      try {
        await deleteDepartmentMember({ username: record.username });
        notify({ kind: "success", msg: "已删除成员" });
        table.reload();
      } catch {
        notify({ kind: "error", msg: "删除失败，请稍后重试" });
      } finally {
        setDeletingMap((m) => ({ ...m, [record.username]: false }));
      }
    },

    departmentFilters,
  });

  // ======================================================
  // 3) 任命职务（弹窗）
  // ======================================================
  const [appointModal, setAppointModal] = useState<AppointModalState>({
    open: false,
    sharedSearchKey: "",
    suggestions: [],
    selectedUser: null,
    values: {},
  });

  const [searchingSuggestion, setSearchingSuggestion] = useState(false);
  const searchingRef = useRef(false);

  const openAppointModal = useCallback(async () => {
    await ensureDepartmentsLoaded();
    setAppointModal({
      open: true,
      sharedSearchKey: "",
      suggestions: [],
      selectedUser: null,
      values: {},
    });
  }, [ensureDepartmentsLoaded]);

  const closeAppointModal = useCallback(() => {
    setAppointModal((s) => ({ ...s, open: false }));
  }, []);

  /**
   * ✅ 共用搜索：姓名/学号两端都调这个
   * - key 既可以是姓名，也可以是学号（后端 /user/pages 支持）
   */
  const onSearchUser = useCallback(
    async (keyInput: string) => {
      setAppointModal((s) => ({ ...s, sharedSearchKey: keyInput }));

      const key = keyInput.trim();
      if (!key) {
        // 清空搜索：只清 suggestions，不强行清 selected（由 UI 的 clear 触发清 selected）
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

  /**
   * ✅ 选择用户：姓名/学号任一端选中，都走这里
   * - 统一写入 selectedUser（唯一真相源）
   * - 同步 values：保证 name/username 永远一致
   */
  const onPickUser = useCallback((u: UserSuggestion) => {
    setAppointModal((s) => ({
      ...s,
      sharedSearchKey: `${u.name} ${u.username}`.trim(),
      suggestions: [],
      selectedUser: u,
      values: {
        ...s.values,
        name: u.name,
        username: u.username,
      },
    }));
  }, []);

  /**
   * ✅ 清空选择（用于：任一端 allowClear / 手动改输入导致不可信）
   * - 清掉 selectedUser，同时把 name/username 置空，避免“不一致”
   */
  const clearPickedUser = useCallback(() => {
    setAppointModal((s) => ({
      ...s,
      selectedUser: null,
      values: {
        ...s.values,
        name: "",
        username: "",
      },
    }));
  }, []);

  const [submittingAppoint, setSubmittingAppoint] = useState(false);
  const appointSubmittingRef = useRef(false);

  const submitAppoint = useCallback(
    async (values: AppointRoleFormValues) => {
      if (appointSubmittingRef.current) return;

      /**
       * ✅ 强一致校验：
       * - 必须选中过用户（selectedUser）
       * - 并且表单里的 name/username 必须与 selectedUser 对齐
       * 这样可以防止：用户手动改了一边导致两者不一致
       */
      const picked = appointModal.selectedUser;
      if (!picked) {
        notify({ kind: "error", msg: "请从下拉中选择用户（姓名或学号）" });
        return;
      }
      if (values.username !== picked.username || values.name !== picked.name) {
        notify({ kind: "error", msg: "姓名与学号不一致，请重新从下拉选择" });
        return;
      }

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
    [appointModal.selectedUser, closeAppointModal, notify, table],
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

    /**
     * ✅ 新 API（替换旧的 onNameInputChange/onPickSuggestion）
     * - onSearchUser：姓名/学号共用搜索
     * - onPickUser：姓名/学号任一端选中都回填
     * - clearPickedUser：任一端清空时调用，保证强一致
     */
    onSearchUser,
    onPickUser,
    clearPickedUser,

    submittingAppoint,
    submitAppoint,

    searchingSuggestion,
  };
}
