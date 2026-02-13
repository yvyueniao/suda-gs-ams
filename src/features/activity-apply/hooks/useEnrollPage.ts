// src/features/activity-apply/hooks/useEnrollPage.ts
/**
 * useEnrollPage（改造版：详情“跳转页面”而非弹窗）
 *
 * ✅ 目标
 * - 列表页点击“详情” => 跳转到隐藏路由详情页 /activity-apply/detail/:id
 * - useEnrollPage 不再维护“详情弹窗状态 / 拉详情接口”
 * - 仍然维护：
 *   1) 列表页 table（报名/取消逻辑仍通过 applyFlow 统一入口）
 *   2) 补报名弹窗状态（UI 占位）
 *
 * ✅ 变化点
 * - 移除：EnrollDetailState / loadDetail / closeDetail / reloadDetail
 * - 新增：navigateToDetail（暴露给页面层可选使用）
 * - useEnrollTable 传入 onOpenDetail：只负责“把 id 抛出去”，由这里执行跳转
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { EnrollTableRow } from "../types";
import { useEnrollTable } from "./useEnrollTable";
import { useApplyFlow } from "./useApplyFlow";

export type SupplementApplyState = {
  visible: boolean;
  activityId: number | null;
};

export function useEnrollPage(options?: {
  onNotify?: (payload: {
    kind: "success" | "error" | "info";
    msg: string;
  }) => void;
}) {
  const navigate = useNavigate();

  // =========================
  // 1) 补报名弹窗状态
  // =========================
  const [supplement, setSupplement] = useState<SupplementApplyState>({
    visible: false,
    activityId: null,
  });

  const openSupplement = useCallback((activityId: number) => {
    setSupplement({ visible: true, activityId });
  }, []);

  const closeSupplement = useCallback(() => {
    setSupplement({ visible: false, activityId: null });
  }, []);

  // =========================
  // 2) 跳转到详情页（隐藏路由）
  // =========================
  const navigateToDetail = useCallback(
    (id: number) => {
      navigate(`/activity-apply/detail/${id}`);
    },
    [navigate],
  );

  // =========================
  // 3) 用 ref 桥接：让 onRegister / onCancel 能“晚绑定”到 applyFlow
  // =========================
  const applyFlowRef = useRef<ReturnType<typeof useApplyFlow> | null>(null);

  // 注意：buildEnrollColumns 会固定住函数引用，所以这里必须稳定（不依赖 applyFlow）
  const onRegisterViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startRegister({ id: row.id, name: row.name });
  }, []);

  // ✅ 新增：取消也统一走 flow（用于最终成功/失败 toast）
  const onCancelViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startCancelWithNotify(row.id);
  }, []);

  // =========================
  // 4) 先创建 table（把 onRegister / onCancel / onOpenDetail 传进去），拿到 applyActions
  // =========================
  const { table, applyActions } = useEnrollTable({
    onOpenDetail: (id) => {
      navigateToDetail(id);
    },

    // ✅ 报名按钮永远走这个入口，它再转发给 applyFlowRef
    onRegister: onRegisterViaFlow,

    // ✅ 取消按钮也走这个入口（confirm 由 ActionCell 负责，这里只做“最终结果 toast”）
    onCancel: onCancelViaFlow,
  });

  // =========================
  // 5) 再创建 applyFlow（复用同一套 applyActions）
  // =========================
  const applyFlow = useApplyFlow({
    applyActions, // ✅ 复用 table 内同一套 actions（同一套 loading / 错误策略）
    onChanged: async () => {
      await table.reload();
    },
    onNotify: options?.onNotify,
    enableCandidateInFailModal: true,
    muteActionErrorToast: true,
  });

  // ✅ 把 flow 写进 ref，供 onRegisterViaFlow / onCancelViaFlow 使用
  useEffect(() => {
    applyFlowRef.current = applyFlow;
  }, [applyFlow]);

  return useMemo(
    () => ({
      table,
      applyActions,
      applyFlow,

      // ✅ 页面层可直接调用（可选）
      navigateToDetail,

      supplement: {
        ...supplement,
        openSupplement,
        closeSupplement,
      },
    }),
    [
      table,
      applyActions,
      applyFlow,
      navigateToDetail,
      supplement,
      openSupplement,
      closeSupplement,
    ],
  );
}
