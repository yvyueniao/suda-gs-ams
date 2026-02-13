// src/features/activity-apply/hooks/useEnrollPage.ts
/**
 * useEnrollPage（改造版：详情“跳转页面”而非弹窗）
 *
 * ✅ 目标
 * - 列表页点击“详情” => 跳转到隐藏路由详情页 /activity-apply/detail/:id
 * - useEnrollPage 不再维护“详情弹窗状态 / 拉详情接口”
 * - 仍然维护：
 *   1) 列表页 table（报名/取消逻辑统一通过 applyFlow 入口）
 *   2) 补报名弹窗状态（UI 占位）
 *
 * ✅ 变化点
 * - 移除：EnrollDetailState / loadDetail / closeDetail / reloadDetail
 * - 新增：navigateToDetail（暴露给页面层可选使用）
 * - useEnrollTable 传入 onOpenDetail：只负责“把 id 抛出去”，由这里执行跳转
 *
 * ✅ 本次关键修复点
 * - 列表页“取消报名/取消候补/取消审核”在二次确认后：
 *   需要给出最终“取消成功/失败”的 toast
 * - 解决方案：
 *   - 取消动作不再直接走 applyActions.cancel
 *   - 统一走 applyFlow.startCancelWithNotify（内部会触发 onNotify）
 *   - confirm 仍然由 ActionCell.confirm 负责（这里不做 UI）
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
  // 1) 补报名弹窗状态（占位）
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

  /**
   * 注意：
   * - buildEnrollColumns 会把 onRegister/onCancel 固定住
   * - 所以这里的函数引用必须稳定（不能依赖 applyFlow 这个对象）
   * - 用 ref 来读到最新的 flow 实例
   */

  // ✅ 报名：统一走 flow（必弹成功/失败结果弹窗）
  const onRegisterViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startRegister({ id: row.id, name: row.name });
  }, []);

  // ✅ 取消：统一走 flow（执行取消 + 最终成功/失败 toast）
  // confirm 已由 ActionCell.confirm 处理，这里只关心最终结果提示
  const onCancelViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startCancelWithNotify(row.id);
  }, []);

  // =========================
  // 4) 先创建 table（注入 onRegister / onCancel / onOpenDetail）
  //    目的：拿到 applyActions（并复用同一套 loading/策略）
  // =========================
  const { table, applyActions } = useEnrollTable({
    onOpenDetail: (id) => {
      navigateToDetail(id);
    },

    // ✅ 报名按钮：永远走这个入口，再转发给 applyFlowRef
    onRegister: onRegisterViaFlow,

    // ✅ 取消按钮：也走这个入口（用于最终 toast）
    onCancel: onCancelViaFlow,
  });

  // =========================
  // 5) 再创建 applyFlow（复用同一套 applyActions）
  // =========================
  const applyFlow = useApplyFlow({
    applyActions, // ✅ 与 table 共用同一套 actions（同一套 loading / 错误口径）
    onChanged: async () => {
      // ✅ 任一动作成功后，刷新列表，更新按钮状态/人数等
      await table.reload();
    },
    onNotify: options?.onNotify,
    enableCandidateInFailModal: true,
    muteActionErrorToast: true,
  });

  // ✅ 把 flow 写进 ref：给 onRegisterViaFlow / onCancelViaFlow 使用
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
