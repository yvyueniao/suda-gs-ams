// src/features/activity-apply/hooks/useEnrollPage.ts

/**
 * useEnrollPage（改造版：详情“跳转页面”而非弹窗）
 *
 * ✅ 目标
 * - 列表页点击“详情” => 跳转到隐藏路由详情页 /activity-apply/detail/:id
 * - useEnrollPage 不再维护“详情弹窗状态 / 拉详情接口”
 * - 仍然维护：
 *   1) 列表页 table（报名/取消逻辑统一通过 applyFlow 入口）
 *   2) 补报名弹窗状态（✅ 真实实现：抽到 useSupplementApply）
 *
 * ✅ 本次关键修复点
 * - 列表页“取消报名/取消候补/取消审核”在二次确认后：
 *   需要给出最终“取消成功/失败”的 toast
 * - 解决方案：
 *   - 取消动作不再直接走 applyActions.cancel
 *   - 统一走 applyFlow.startCancelWithNotify（内部会触发 onNotify）
 *   - confirm 仍然由 ActionCell.confirm 负责（这里不做 UI）
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import type { EnrollTableRow } from "../types";
import { useEnrollTable } from "./useEnrollTable";
import { useApplyFlow } from "./useApplyFlow";

// ✅ 补报名业务 Hook（真实实现）
import { useSupplementApply } from "./useSupplementApply";

export function useEnrollPage(options?: {
  onNotify?: (payload: {
    kind: "success" | "error" | "info";
    msg: string;
  }) => void;
}) {
  const navigate = useNavigate();

  // =========================
  // 1) 跳转到详情页（隐藏路由）
  // =========================
  const navigateToDetail = useCallback(
    (id: number) => {
      navigate(`/activity-apply/detail/${id}`);
    },
    [navigate],
  );

  // =========================
  // 2) 用 ref 桥接：让 onRegister / onCancel 能“晚绑定”到 applyFlow
  // =========================
  const applyFlowRef = useRef<ReturnType<typeof useApplyFlow> | null>(null);

  // ✅ 报名：统一走 flow（必弹成功/失败结果弹窗）
  const onRegisterViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startRegister({ id: row.id, name: row.name });
  }, []);

  // ✅ 取消：统一走 flow（执行取消 + 最终成功/失败 toast）
  const onCancelViaFlow = useCallback(async (row: EnrollTableRow) => {
    await applyFlowRef.current?.startCancelWithNotify(row.id);
  }, []);

  // =========================
  // 3) 先创建 table（注入 onRegister / onCancel / onOpenDetail）
  //    目的：拿到 applyActions（并复用同一套 loading/策略）
  // =========================
  const { table, applyActions } = useEnrollTable({
    onOpenDetail: (id) => {
      navigateToDetail(id);
    },
    onRegister: onRegisterViaFlow,
    onCancel: onCancelViaFlow,
  });

  // =========================
  // 4) 再创建 applyFlow（复用同一套 applyActions）
  // =========================
  const applyFlow = useApplyFlow({
    applyActions,
    onChanged: async () => {
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

  // =========================
  // 5) 补报名（真实实现）：抽离到 useSupplementApply
  // - 模糊匹配 + 选择活动回填 ID + 必传 PDF + 提交
  // =========================
  const supplement = useSupplementApply({
    onNotify: options?.onNotify,
    onChanged: async () => {
      await table.reload();
    },
  });

  return useMemo(
    () => ({
      table,
      applyActions,
      applyFlow,

      navigateToDetail,

      // ✅ 页面层直接消费：
      // supplement.modal.open / supplement.submitting / supplement.form / ...
      supplement,
    }),
    [table, applyActions, applyFlow, navigateToDetail, supplement],
  );
}
