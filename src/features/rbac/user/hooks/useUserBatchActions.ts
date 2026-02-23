// src/features/rbac/user/hooks/useUserBatchActions.ts

import { useCallback, useMemo, useRef, useState } from "react";

import type { Notify } from "../../../../shared/ui";

import { batchDeleteUser, batchLockUser } from "../api";

/** ✅ 稳定的 noop，避免每次 render 产生新函数 */
const noopNotify: Notify = () => {
  // noop
};

function errToMsg(err: unknown, fallback: string) {
  const anyErr = err as any;
  const msg = typeof anyErr?.message === "string" ? anyErr.message.trim() : "";
  return msg || fallback;
}

export function useUserBatchActions(options?: { onNotify?: Notify }) {
  /** ✅ notify 必须稳定，否则 callback 会抖动 */
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // ======================================================
  // 1) 批量删除
  // ======================================================
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const batchDelete = useCallback(
    async (usernames: string[]) => {
      const list = (usernames ?? []).map((x) => String(x)).filter(Boolean);
      if (list.length === 0) {
        notify({ kind: "info", msg: "请先选择要删除的用户" });
        return;
      }

      if (deletingRef.current) return;

      deletingRef.current = true;
      setDeleting(true);

      try {
        await batchDeleteUser(list);

        // ✅ 成功：给一个清晰提示（成功信息通常不是后端 msg，这里保持前端聚合更友好）
        notify({ kind: "success", msg: `已删除 ${list.length} 个用户` });
      } catch (err) {
        // ✅ 失败：优先后端 msg（ApiError.message）
        notify({ kind: "error", msg: errToMsg(err, "批量删除失败") });
        throw err;
      } finally {
        deletingRef.current = false;
        setDeleting(false);
      }
    },
    [notify],
  );

  // ======================================================
  // 2) 批量封锁
  // ======================================================
  const [locking, setLocking] = useState(false);
  const lockingRef = useRef(false);

  const batchLock = useCallback(
    async (usernames: string[]) => {
      const list = (usernames ?? []).map((x) => String(x)).filter(Boolean);
      if (list.length === 0) {
        notify({ kind: "info", msg: "请先选择要封锁的用户" });
        return;
      }

      if (lockingRef.current) return;

      lockingRef.current = true;
      setLocking(true);

      try {
        await batchLockUser(list);

        // ✅ 成功：前端聚合提示
        notify({ kind: "success", msg: `已封锁 ${list.length} 个用户` });
      } catch (err) {
        // ✅ 失败：优先后端 msg（ApiError.message）
        notify({ kind: "error", msg: errToMsg(err, "批量封锁失败") });
        throw err;
      } finally {
        lockingRef.current = false;
        setLocking(false);
      }
    },
    [notify],
  );

  return {
    // delete
    deleting,
    batchDelete,

    // lock
    locking,
    batchLock,
  };
}
