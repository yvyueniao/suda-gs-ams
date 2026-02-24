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

  /**
   * ✅ 你要求：保留 init（页面 useEffect 初始化加载部门）
   * 所以这里让 openModal 只负责打开，不再负责加载
   */
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

  /**
   * ✅ 关键修复：搜索请求“防抖 + 最小输入长度 + TTL 缓存 + 只保留最后一次结果”
   */
  const MIN_KEY_LEN = 2; // 最小输入长度：1 个字就搜 = 噪音太大
  const DEBOUNCE_MS = 1000; // 防抖：输入停顿后再发
  const CACHE_TTL_MS = 30_000; // 30s TTL：短期重复输入直接复用

  const debounceTimerRef = useRef<number | null>(null);
  const lastReqIdRef = useRef(0);

  // key -> { at, list }
  const cacheRef = useRef<Map<string, { at: number; list: UserSuggestion[] }>>(
    new Map(),
  );

  /**
   * ✅ 用 ref 持有最新 selectedUser，避免 submitAppoint 依赖它导致函数抖动
   * （这里把你原来“用 useMemo 做副作用”的写法改成 useEffect，符合 React 约定）
   */
  const pickedUserRef = useRef<UserSuggestion | null>(
    appointModal.selectedUser,
  );
  useEffect(() => {
    pickedUserRef.current = appointModal.selectedUser;
  }, [appointModal.selectedUser]);

  /**
   * ✅ 按你的要求：openModal 只打开，不再加载 departments
   * （部门列表由页面 init 调用 loadDepartments 来保证）
   */
  const openAppointModal = useCallback(() => {
    // 打开时顺手让“上一轮搜索”全部失效，避免抖动回填
    lastReqIdRef.current += 1;

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

    setAppointModal((s) => ({ ...s, open: false }));
  }, []);

  /**
   * ✅ 共用搜索：姓名/学号两端都调这个
   * - key 既可以是姓名，也可以是学号（后端 /user/pages 支持）
   *
   * 修复点：
   * 1) debounce：输入停顿后发请求
   * 2) 最小长度：减少“每敲一个字就请求”
   * 3) TTL 缓存：短时间重复输入不发请求
   * 4) 只接收最后一次：防竞态覆盖
   */
  const onSearchUser = useCallback(
    async (keyInput: string) => {
      setAppointModal((s) => ({ ...s, sharedSearchKey: keyInput }));

      const key = keyInput.trim();

      // ✅ 取消上一次 debounce
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // 空/过短：直接清候选，不请求
      if (!key || key.length < MIN_KEY_LEN) {
        lastReqIdRef.current += 1; // 让飞行中的请求失效
        setSearchingSuggestion(false);
        setAppointModal((s) => ({ ...s, suggestions: [] }));
        return;
      }

      // ✅ TTL cache 命中：直接用缓存
      const now = Date.now();
      const cached = cacheRef.current.get(key);
      if (cached && now - cached.at <= CACHE_TTL_MS) {
        lastReqIdRef.current += 1; // 让之前飞行中的请求失效
        setSearchingSuggestion(false);
        setAppointModal((s) => ({ ...s, suggestions: cached.list }));
        return;
      }

      const reqId = ++lastReqIdRef.current;
      setSearchingSuggestion(true);

      debounceTimerRef.current = window.setTimeout(async () => {
        try {
          const list = await searchUserSuggestionsByName({ key, pageSize: 20 });

          // ✅ 只接收最后一次请求
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

  /**
   * ✅ 选择用户：姓名/学号任一端选中，都走这里
   * - 统一写入 selectedUser（唯一真相源）
   * - 同步 values：保证 name/username 永远一致
   */
  const onPickUser = useCallback((u: UserSuggestion) => {
    // 选中后：清候选 + 让飞行请求失效 + 取消 debounce
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

  /**
   * ✅ 清空选择（用于：任一端 allowClear / 手动改输入导致不可信）
   * - 清掉 selectedUser，同时把 name/username 置空，避免“不一致”
   */
  const clearPickedUser = useCallback(() => {
    // 清空也顺手取消 debounce + 让飞行请求失效
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

      /**
       * ✅ 强一致校验：
       * - 必须选中过用户（selectedUser）
       * - 并且表单里的 name/username 必须与 selectedUser 对齐
       */
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
