// src/features/rbac/admin/hooks/useAdminManagePage.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type AppointModalState = {
  open: boolean;
  sharedSearchKey: string;
  suggestions: UserSuggestion[];
  selectedUser: UserSuggestion | null;
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

  /**
   * ✅ 关键修复：每次打开弹窗，都换一个 key，强制 Modal/Form 重建
   * - 彻底消灭 “第二次打开残留” 的概率问题
   */
  const [appointModalKey, setAppointModalKey] = useState(0);

  const MIN_KEY_LEN = 1;
  const DEBOUNCE_MS = 1000;
  const CACHE_TTL_MS = 30_000;

  const debounceTimerRef = useRef<number | null>(null);
  const lastReqIdRef = useRef(0);

  const cacheRef = useRef<Map<string, { at: number; list: UserSuggestion[] }>>(
    new Map(),
  );

  const pickedUserRef = useRef<UserSuggestion | null>(
    appointModal.selectedUser,
  );
  useEffect(() => {
    pickedUserRef.current = appointModal.selectedUser;
  }, [appointModal.selectedUser]);

  const openAppointModal = useCallback(() => {
    // ✅ 让上一轮飞行请求失效
    lastReqIdRef.current += 1;

    // ✅ 强制重建：key++
    setAppointModalKey((k) => k + 1);

    // ✅ 打开即重置数据源
    setSearchingSuggestion(false);
    setAppointModal({
      open: true,
      sharedSearchKey: "",
      suggestions: [],
      selectedUser: null,
      values: {},
    });
  }, []);

  const closeAppointModal = useCallback(() => {
    // 关闭时取消未触发的 debounce，且让飞行中的请求失效
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastReqIdRef.current += 1;

    // ✅ 关闭也立刻清空（即使 Modal 还在做动画）
    setSearchingSuggestion(false);
    setAppointModal({
      open: false,
      sharedSearchKey: "",
      suggestions: [],
      selectedUser: null,
      values: {},
    });
  }, []);

  const onSearchUser = useCallback(
    async (keyInput: string) => {
      setAppointModal((s) => ({ ...s, sharedSearchKey: keyInput }));

      const key = keyInput.trim();

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (!key || key.length < MIN_KEY_LEN) {
        lastReqIdRef.current += 1;
        setSearchingSuggestion(false);
        setAppointModal((s) => ({ ...s, suggestions: [] }));
        return;
      }

      const now = Date.now();
      const cached = cacheRef.current.get(key);
      if (cached && now - cached.at <= CACHE_TTL_MS) {
        lastReqIdRef.current += 1;
        setSearchingSuggestion(false);
        setAppointModal((s) => ({ ...s, suggestions: cached.list }));
        return;
      }

      const reqId = ++lastReqIdRef.current;
      setSearchingSuggestion(true);

      debounceTimerRef.current = window.setTimeout(async () => {
        try {
          const list = await searchUserSuggestionsByName({ key, pageSize: 20 });

          if (reqId !== lastReqIdRef.current) return;

          const finalList = Array.isArray(list) ? list : [];
          cacheRef.current.set(key, { at: Date.now(), list: finalList });

          setAppointModal((s) => ({ ...s, suggestions: finalList }));
        } catch {
          if (reqId !== lastReqIdRef.current) return;
          notify({ kind: "error", msg: "搜索用户失败" });
          setAppointModal((s) => ({ ...s, suggestions: [] }));
        } finally {
          if (reqId === lastReqIdRef.current) setSearchingSuggestion(false);
        }
      }, DEBOUNCE_MS);
    },
    [notify],
  );

  const onPickUser = useCallback((u: UserSuggestion) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastReqIdRef.current += 1;

    setSearchingSuggestion(false);
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

  const clearPickedUser = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastReqIdRef.current += 1;

    setSearchingSuggestion(false);
    setAppointModal((s) => ({
      ...s,
      suggestions: [],
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

      const picked = pickedUserRef.current;
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
    appointModalKey, // ✅ 新增：用于强制重建
    openAppointModal,
    closeAppointModal,

    onSearchUser,
    onPickUser,
    clearPickedUser,

    submittingAppoint,
    submitAppoint,

    searchingSuggestion,
  };
}
