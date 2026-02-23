// src/features/rbac/user/hooks/useUserRowActions.ts

import { useCallback, useMemo, useRef, useState } from "react";

import type { Notify } from "../../../../shared/ui";

import type { UserInfo, UserTableRow } from "../types";
import { getUserInfo, unlockUser } from "../api";

/** ✅ 稳定的 noop，避免每次 render 产生新函数 */
const noopNotify: Notify = () => {
  // noop
};

function errToMsg(err: unknown, fallback: string) {
  const anyErr = err as any;
  const msg = typeof anyErr?.message === "string" ? anyErr.message.trim() : "";
  return msg || fallback;
}

export function useUserRowActions(options?: { onNotify?: Notify }) {
  /** ✅ notify 必须稳定，否则上层 useMemo/useCallback 容易抖动 */
  const notify = useMemo<Notify>(
    () => options?.onNotify ?? noopNotify,
    [options?.onNotify],
  );

  // ======================================================
  // 1) 行内解封（按 username 管理 loading）
  // ======================================================
  const [unlockingMap, setUnlockingMap] = useState<Record<string, boolean>>({});
  const unlockingRef = useRef<Record<string, boolean>>({});

  const isUnlocking = useCallback(
    (username: string) => !!unlockingMap[username],
    [unlockingMap],
  );

  const unlock = useCallback(
    async (row: UserTableRow) => {
      const key = String(row.username ?? "").trim();
      if (!key) return;

      // ✅ 防重复点击：用 ref 判断（避免把 unlockingMap 放进依赖导致 unlock 抖动）
      if (unlockingRef.current[key]) return;

      unlockingRef.current[key] = true;
      setUnlockingMap((m) => ({ ...m, [key]: true }));

      try {
        await unlockUser({ username: key });

        // ✅ 成功提示：尽量保持友好明确（这里不是后端 msg，是前端补充信息）
        notify({ kind: "success", msg: `已解封：${row.name}（${key}）` });
      } catch (err) {
        // ✅ 失败提示：优先后端 msg（ApiError.message）
        notify({ kind: "error", msg: errToMsg(err, "解封失败") });
        throw err;
      } finally {
        unlockingRef.current[key] = false;
        setUnlockingMap((m) => ({ ...m, [key]: false }));
      }
    },
    [notify],
  );

  // ======================================================
  // 2) 行内详情（按 username 管理 loading）
  // - ✅ 调用 getUserInfo（api.ts 已适配）
  // - 只负责拉详情并返回
  // - 打开 Modal/Drawer 交给页面层
  // ======================================================
  const [detailLoadingMap, setDetailLoadingMap] = useState<
    Record<string, boolean>
  >({});
  const detailLoadingRef = useRef<Record<string, boolean>>({});

  const isLoadingDetail = useCallback(
    (username: string) => !!detailLoadingMap[username],
    [detailLoadingMap],
  );

  const fetchDetail = useCallback(
    async (row: UserTableRow): Promise<UserInfo> => {
      const key = String(row.username ?? "").trim();
      if (!key) throw new Error("username is required");

      // ✅ 防重复点击：用 ref 判断（避免把 detailLoadingMap 放进依赖导致 fetchDetail 抖动）
      if (detailLoadingRef.current[key]) {
        throw new Error("detail is loading");
      }

      detailLoadingRef.current[key] = true;
      setDetailLoadingMap((m) => ({ ...m, [key]: true }));

      try {
        const detail = await getUserInfo(key);
        return detail;
      } catch (err) {
        // ✅ 失败提示：优先后端 msg（ApiError.message）
        notify({ kind: "error", msg: errToMsg(err, "加载用户详情失败") });
        throw err;
      } finally {
        detailLoadingRef.current[key] = false;
        setDetailLoadingMap((m) => ({ ...m, [key]: false }));
      }
    },
    [notify],
  );

  return {
    // unlock
    unlock,
    isUnlocking,

    // detail
    fetchDetail,
    isLoadingDetail,
  };
}
