// src/features/rbac/user/hooks/useUserRowActions.ts

import { useCallback, useMemo, useState } from "react";

import type { Notify } from "../../../../shared/ui";

import type { UserInfo, UserTableRow } from "../types";
import { getUserInfo, unlockUser } from "../api";

/** ✅ 稳定的 noop，避免每次 render 产生新函数 */
const noopNotify: Notify = () => {
  // noop
};

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

  const isUnlocking = useCallback(
    (username: string) => !!unlockingMap[username],
    [unlockingMap],
  );

  const unlock = useCallback(
    async (row: UserTableRow) => {
      const key = row.username;
      if (!key) return;

      // 防重复点击
      if (unlockingMap[key]) return;

      setUnlockingMap((m) => ({ ...m, [key]: true }));
      try {
        await unlockUser({ username: key });
        notify({ kind: "success", msg: `已解封：${row.name}（${key}）` });
      } catch {
        notify({ kind: "error", msg: "解封失败，请稍后重试" });
        throw new Error("unlock failed");
      } finally {
        setUnlockingMap((m) => ({ ...m, [key]: false }));
      }
    },
    [notify, unlockingMap],
  );

  // ======================================================
  // 2) 行内详情（按 username 管理 loading）
  // - ✅ 现在改为调用 /user/infoforUsername（已在 api.ts 的 getUserInfo 里适配）
  // - 只负责拉详情并返回
  // - 打开 Modal/Drawer 交给页面层
  // ======================================================
  const [detailLoadingMap, setDetailLoadingMap] = useState<
    Record<string, boolean>
  >({});

  const isLoadingDetail = useCallback(
    (username: string) => !!detailLoadingMap[username],
    [detailLoadingMap],
  );

  const fetchDetail = useCallback(
    async (row: UserTableRow): Promise<UserInfo> => {
      const key = row.username;
      if (!key) throw new Error("username is required");

      // 防重复点击
      if (detailLoadingMap[key]) throw new Error("detail is loading");

      setDetailLoadingMap((m) => ({ ...m, [key]: true }));
      try {
        const detail = await getUserInfo(key);
        return detail;
      } catch {
        notify({ kind: "error", msg: "加载用户详情失败" });
        throw new Error("fetch detail failed");
      } finally {
        setDetailLoadingMap((m) => ({ ...m, [key]: false }));
      }
    },
    [detailLoadingMap, notify],
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
