// src/features/activity-apply/table/helpers.ts

/**
 * ============================================
 * activity-apply/table/helpers
 * ============================================
 *
 * 文件定位：
 * - features/activity-apply/table 层
 * - 为“活动/讲座报名列表页 / 详情页”提供纯工具函数
 *
 * 设计目标：
 * 1) ✅ 不拉接口
 * 2) ✅ 不依赖 React
 * 3) ✅ 纯函数
 *
 * 当前能力：
 * - 状态派生
 * - 主按钮逻辑复用
 * - Tag 映射
 * - 二次确认文案生成
 * - 本地搜索 / 筛选 / 排序
 *
 * ❌ 已删除：
 * - 取消报名 12 小时限制逻辑
 *
 * ✅ 本次修复点：
 * 1) ✅ mergeEnrollRows 补齐 successApplyNum（消灭 TS 报错：EnrollTableRow 缺字段）
 * 2) 导出 CancelConfirmMetaPayload（让 columns.tsx 不需要 as any）
 * 3) matchFilters 去掉 as any：用“按字段匹配”的类型安全实现
 * 4) 新增 getSignWindowReason：统一生成“报名时间窗外”的禁用原因（可选用）
 * 5) getSortValue 支持 successApplyNum 排序
 *
 * ✅ 额外增强（不破坏你原逻辑）：
 * - getSortValue 默认分支：尽量避免 any，改成 Record<string, unknown> 安全读取
 */

import type {
  ActivityItem,
  EnrollTableRow,
  MyApplicationItem,
  ApplyActionState,
} from "../types";

import type { TableSorter } from "../../../shared/components/table";
import { parseTimeMs, isInTimeWindow } from "../../../shared/utils/datetime";

/* =====================================================
 * 一、时间相关（仅时间判断，不含业务规则）
 * ===================================================== */

/**
 * 是否在报名时间窗内（包含边界）
 *
 * ✅ 说明：
 * - 这里只做“是否在时间窗”判断，不再包含“活动开始前 12h 不能取消”等业务规则
 * - 具体禁用逻辑由页面/列工厂决定（例如：取消按钮只受报名时间窗限制）
 */
export function inSignWindow(
  activity: Pick<ActivityItem, "signStartTime" | "signEndTime">,
  nowMs: number,
) {
  return isInTimeWindow(activity.signStartTime, activity.signEndTime, nowMs);
}

/**
 * ✅ 可选复用：统一的“报名时间窗”禁用原因
 * - 在窗外返回文案，在窗内返回 undefined
 */
export function getSignWindowReason(
  activity: Pick<ActivityItem, "signStartTime" | "signEndTime">,
  nowMs: number,
): string | undefined {
  return inSignWindow(activity, nowMs) ? undefined : "不在报名时间范围内";
}

/* =====================================================
 * 二、报名状态派生（按钮状态机）
 * ===================================================== */

/**
 * 把 /activity/userApplications 的 state 映射为前端 ApplyActionState
 *
 * 后端枚举：
 * 0: 报名成功
 * 1: 候补中
 * 2: 候补成功
 * 3: 候补失败
 * 4: 审核中
 * 5: 审核失败
 */
export function deriveApplyActionState(
  app?: MyApplicationItem,
): ApplyActionState {
  if (!app) return "NOT_APPLIED";

  switch (app.state) {
    case 0:
      return "APPLIED";
    case 1:
      return "CANDIDATE";
    case 2:
      return "CANDIDATE_SUCC";
    case 3:
      return "CANDIDATE_FAIL";
    case 4:
      return "REVIEWING";
    case 5:
      return "REVIEW_FAIL";
    default:
      return "NOT_APPLIED";
  }
}

/**
 * 生成 activityId -> MyApplicationItem 的索引
 * - 避免在 map/render 中反复 find
 */
export function buildMyApplicationMap(apps: MyApplicationItem[]) {
  const map = new Map<number, MyApplicationItem>();
  for (const a of apps) map.set(a.activityId, a);
  return map;
}

/**
 * 把活动列表与“我的报名记录”拼成表格行（EnrollTableRow）
 * - 每行带上 myApplication + applyState（前端派生）
 * - ✅ 补齐：successApplyNum（成功申请数 = 成功报名 + 成功候补）
 */
export function mergeEnrollRows(
  activities: ActivityItem[],
  myApps: MyApplicationItem[],
): EnrollTableRow[] {
  const map = buildMyApplicationMap(myApps);

  return activities.map((act) => {
    const my = map.get(act.id);
    const applyState = deriveApplyActionState(my);

    // ✅ 成功申请 = 成功报名(registeredNum) + 成功候补(candidateSuccNum)
    const successApplyNum =
      (typeof act.registeredNum === "number" ? act.registeredNum : 0) +
      (typeof act.candidateSuccNum === "number" ? act.candidateSuccNum : 0);

    return {
      ...act,
      myApplication: my,
      applyState,
      successApplyNum,
    };
  });
}

/* =====================================================
 * 三、主按钮 / Tag 逻辑复用
 * ===================================================== */

/**
 * 主按钮元信息（列表页/详情页共用）
 *
 * 规则：
 * - NOT_APPLIED / CANDIDATE_FAIL / REVIEW_FAIL：报名
 * - APPLIED / CANDIDATE_SUCC：取消报名
 * - CANDIDATE：取消候补
 * - REVIEWING：取消审核
 */
export function getPrimaryActionMeta(applyState: ApplyActionState): {
  text: string;
  isCancel: boolean;
} {
  switch (applyState) {
    case "APPLIED":
    case "CANDIDATE_SUCC":
      return { text: "取消报名", isCancel: true };
    case "CANDIDATE":
      return { text: "取消候补", isCancel: true };
    case "REVIEWING":
      return { text: "取消审核", isCancel: true };
    default:
      return { text: "报名", isCancel: false };
  }
}

/**
 * 报名状态 Tag 展示元信息（列表页/详情页共用）
 * - label：展示文字
 * - color：antd Tag color
 */
export function getApplyStateTagMeta(applyState: ApplyActionState): {
  label: string;
  color?: string;
} {
  const labelMap: Record<ApplyActionState, string> = {
    NOT_APPLIED: "未报名",
    APPLIED: "报名成功",
    CANDIDATE: "候补中",
    CANDIDATE_SUCC: "候补成功",
    CANDIDATE_FAIL: "候补失败",
    REVIEWING: "审核中",
    REVIEW_FAIL: "审核失败",
  };

  const label = labelMap[applyState] ?? "-";

  if (applyState === "APPLIED" || applyState === "CANDIDATE_SUCC")
    return { label, color: "green" };

  if (applyState === "CANDIDATE") return { label, color: "blue" };

  if (applyState === "REVIEWING") return { label, color: "gold" };

  if (applyState === "CANDIDATE_FAIL" || applyState === "REVIEW_FAIL")
    return { label, color: "red" };

  return { label, color: "default" };
}

/**
 * 取消动作二次确认弹窗文案（列表页/详情页共用）
 *
 * ✅ 说明：
 * - reason 可选：用于展示“为何被禁用/为何提示”的原因
 *   （你现在删除了 12h 规则，因此 reason 只会来自“报名时间窗外”等提示）
 */
export type CancelConfirmMetaPayload = {
  primaryText: string;
  activityName: string;
  reason?: string;
};

export function getCancelConfirmMeta(payload: CancelConfirmMetaPayload): {
  title: string;
  content: string;
  okText: string;
  cancelText: string;
} {
  const { primaryText, activityName, reason } = payload;

  const title =
    primaryText === "取消报名"
      ? "确认取消报名？"
      : primaryText === "取消候补"
        ? "确认取消候补？"
        : primaryText === "取消审核"
          ? "确认取消审核？"
          : "确认执行取消操作？";

  // ✅ 如果有 reason，就把 reason 放进 content（页面/列工厂可以选择传或不传）
  const content = reason
    ? `${reason}（仍确认继续？）`
    : `活动：${activityName}`;

  return {
    title,
    content,
    okText: "确认",
    cancelText: "取消",
  };
}

/* =====================================================
 * 四、本地搜索 / 筛选 / 排序
 * ===================================================== */

/**
 * 报名列表页 filters（TableQuery<F> 里的 F）
 *
 * ⚠️ 说明：
 * - antd Table 的 filters 回传是数组（FilterValue）
 * - 所以这里的字段类型允许：标量 或 标量数组
 */
export type EnrollTableFilters = {
  department?: string | string[];
  type?: 0 | 1 | Array<0 | 1>;
  state?: 0 | 1 | 2 | 3 | 4 | Array<0 | 1 | 2 | 3 | 4>;
  applyState?: ApplyActionState | ApplyActionState[];

  signStartRange?: [number, number];
  signEndRange?: [number, number];
  activityStartRange?: [number, number];
  activityEndRange?: [number, number];
};

/**
 * 关键字搜索文本来源（给本地搜索用）
 * - 默认：name / department / location
 */
export function getSearchTexts(row: EnrollTableRow): string[] {
  return [row.name, row.department, row.location].filter(
    (v): v is string => !!v,
  );
}

function inRange(targetMs: number | null, range?: [number, number]) {
  if (!range) return true;
  if (targetMs == null) return false;
  const [start, end] = range;
  return targetMs >= start && targetMs <= end;
}

function matchScalarOrArray<T>(rowVal: T, filterVal?: T | T[]) {
  if (filterVal == null) return true;
  return Array.isArray(filterVal)
    ? filterVal.includes(rowVal)
    : rowVal === filterVal;
}

/**
 * 过滤匹配（给本地过滤引擎用）
 *
 * 规则：
 * - department/type/state/applyState：支持标量或数组
 * - 时间：字段值落在 range 内
 */
export function matchFilters(
  row: EnrollTableRow,
  filters?: Partial<EnrollTableFilters>,
): boolean {
  if (!filters) return true;

  if (!matchScalarOrArray(row.department, filters.department)) return false;
  if (!matchScalarOrArray(row.type, filters.type)) return false;
  if (!matchScalarOrArray(row.state, filters.state)) return false;
  if (!matchScalarOrArray(row.applyState, filters.applyState)) return false;

  if (!inRange(parseTimeMs(row.signStartTime), filters.signStartRange))
    return false;
  if (!inRange(parseTimeMs(row.signEndTime), filters.signEndRange))
    return false;
  if (!inRange(parseTimeMs(row.activityStime), filters.activityStartRange))
    return false;
  if (!inRange(parseTimeMs(row.activityEtime), filters.activityEndRange))
    return false;

  return true;
}

/**
 * 排序值提取（给本地排序引擎用）
 *
 * ✅ 签名必须对齐 localQuery：
 * (row, sorter: TableSorter) => unknown
 */
export function getSortValue(
  row: EnrollTableRow,
  sorter: TableSorter,
): unknown {
  const field = sorter.field;
  if (!field) return null;

  switch (field) {
    case "id":
      return row.id ?? 0;

    case "name":
      return row.name ?? "";

    case "department":
      return row.department ?? "";

    case "type":
      return row.type ?? 0;

    case "score":
      return row.score ?? 0;

    case "state":
      return row.state ?? 0;

    case "signStartTime":
      return parseTimeMs(row.signStartTime) ?? 0;

    case "signEndTime":
      return parseTimeMs(row.signEndTime) ?? 0;

    case "activityStime":
      return parseTimeMs(row.activityStime) ?? 0;

    case "activityEtime":
      return parseTimeMs(row.activityEtime) ?? 0;

    case "location":
      return row.location ?? "";

    case "fullNum":
      return row.fullNum ?? 0;

    case "registeredNum":
      return row.registeredNum ?? 0;

    case "candidateNum":
      return row.candidateNum ?? 0;

    // ✅ 新增：成功申请排序（成功报名 + 成功候补）
    case "successApplyNum":
      return row.successApplyNum ?? 0;

    case "applyState": {
      const order: ApplyActionState[] = [
        "NOT_APPLIED",
        "REVIEWING",
        "REVIEW_FAIL",
        "CANDIDATE",
        "CANDIDATE_FAIL",
        "CANDIDATE_SUCC",
        "APPLIED",
      ];
      return order.indexOf(row.applyState);
    }

    default: {
      // ✅ 尽量避免 any：用“字典读取”兜底
      const dict = row as unknown as Record<string, unknown>;
      return dict[field] ?? null;
    }
  }
}

/** 组装成 localQuery 常用 options */
export function buildLocalQueryOptions() {
  return { getSearchTexts, matchFilters, getSortValue };
}
