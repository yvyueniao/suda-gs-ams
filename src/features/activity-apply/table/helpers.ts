// src/features/activity-apply/table/helpers.ts

/**
 * ============================================
 * activity-apply/table/helpers
 * ============================================
 *
 * 文件定位：
 * - features/activity-apply/table 层
 * - 为“活动/讲座报名列表页 / 详情页”提供纯工具函数（不含 UI / 不含 React）
 *
 * 设计目标：
 * 1) ✅ 不拉接口：不 import api，不做请求
 * 2) ✅ 不依赖 React：可被任意环境复用（hooks / node mock / 单测）
 * 3) ✅ 保持纯函数：输入确定 => 输出确定（便于测试）
 *
 * 主要职责：
 * - 时间处理：parseTimeMs / inSignWindow / canCancelBy12h
 * - 状态派生：deriveApplyActionState
 * - 列表拼接：mergeEnrollRows（activities + myApplications => EnrollTableRow）
 * - 本地搜索/筛选/排序：getSearchTexts / matchFilters / getSortValue
 * - ✅ 动作主按钮逻辑复用（列表页/详情页共用）：
 *   - getPrimaryActionMeta
 *   - getApplyStateTagMeta
 *   - getCancelConfirmMeta
 *
 * ✅ 本次修改点（关键）：
 * - EnrollTableFilters.department 支持 string | string[]（兼容 antd FilterValue）
 * - matchFilters：兼容 antd filters 的数组值
 * - getSortValue：签名对齐 localQuery 约定 (row, sorter) => value
 */

import type {
  ActivityItem,
  EnrollTableRow,
  MyApplicationItem,
  ApplyActionState,
} from "../types";
import type { TableSorter } from "../../../shared/components/table";

/* =====================================================
 * 一、时间工具
 * ===================================================== */

/**
 * 后端时间格式：YYYY-MM-DD HH:mm:ss
 * 这里转成 ISO-like（YYYY-MM-DDTHH:mm:ss），降低环境差异
 */
export function parseTimeMs(s?: string): number | null {
  if (!s) return null;
  const isoLike = s.replace(" ", "T");
  const t = Date.parse(isoLike);
  return Number.isNaN(t) ? null : t;
}

/** 是否在报名时间窗内（包含边界） */
export function inSignWindow(
  activity: Pick<ActivityItem, "signStartTime" | "signEndTime">,
  nowMs: number,
) {
  const start = parseTimeMs(activity.signStartTime);
  const end = parseTimeMs(activity.signEndTime);
  if (start == null || end == null) return false;
  return nowMs >= start && nowMs <= end;
}

/** 距离活动开始不足 12h 不可取消（后端也会校验，前端用于禁用态提示） */
export function canCancelBy12h(
  activity: Pick<ActivityItem, "activityStime">,
  nowMs: number,
) {
  const start = parseTimeMs(activity.activityStime);
  if (start == null) return true; // 解析失败：不做前置拦截，交给后端
  return start - nowMs >= 12 * 60 * 60 * 1000;
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
 * （避免在 map/render 中反复 find）
 */
export function buildMyApplicationMap(apps: MyApplicationItem[]) {
  const map = new Map<number, MyApplicationItem>();
  for (const a of apps) map.set(a.activityId, a);
  return map;
}

/**
 * 把活动列表与“我的报名记录”拼成表格行
 */
export function mergeEnrollRows(
  activities: ActivityItem[],
  myApps: MyApplicationItem[],
): EnrollTableRow[] {
  const map = buildMyApplicationMap(myApps);

  return activities.map((act) => {
    const my = map.get(act.id);
    const applyState = deriveApplyActionState(my);
    return {
      ...act,
      myApplication: my,
      applyState,
    };
  });
}

/* =====================================================
 * 三、主按钮/Tag 逻辑复用（列表页/详情页共用）
 * ===================================================== */

/**
 * 与列表页一致的主按钮文案：
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
      // NOT_APPLIED / CANDIDATE_FAIL / REVIEW_FAIL
      return { text: "报名", isCancel: false };
  }
}

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

  // antd Tag color：'success' 等也可以，但你现在全用基础色，保持一致
  if (applyState === "APPLIED" || applyState === "CANDIDATE_SUCC")
    return { label, color: "green" };
  if (applyState === "CANDIDATE") return { label, color: "blue" };
  if (applyState === "REVIEWING") return { label, color: "gold" };
  if (applyState === "CANDIDATE_FAIL" || applyState === "REVIEW_FAIL")
    return { label, color: "red" };
  return { label, color: "default" };
}

/**
 * 取消动作二次确认弹窗文案（给 ActionCell.confirm 用）
 * - 列表页/详情页通用
 */
export function getCancelConfirmMeta(payload: {
  primaryText: string; // "取消报名" | "取消候补" | "取消审核"
  activityName: string;
  reason?: string; // 不在窗口 / 12h 限制等
}): {
  title: string;
  content: string;
  okText: string;
  cancelText: string;
} {
  const { primaryText, activityName, reason } = payload;

  // 列表页原来只有 “取消报名/取消候补” 两个分支，这里补齐 “取消审核”
  const title =
    primaryText === "取消报名"
      ? "确认取消报名？"
      : primaryText === "取消候补"
        ? "确认取消候补？"
        : primaryText === "取消审核"
          ? "确认取消审核？"
          : "确认执行取消操作？";

  const content = reason
    ? `${reason}（仍确认继续？）`
    : `活动：${activityName}`;

  return { title, content, okText: "确认", cancelText: "取消" };
}

/* =====================================================
 * 四、本地搜索/筛选/排序（给 applyLocalQuery 用）
 * ===================================================== */

/**
 * 报名列表页 filters（TableQuery<F> 里的 F）
 *
 * ⚠️ 说明：
 * - antd Table 的 filters 回传是数组（FilterValue）
 * - 所以这里的字段类型允许：标量 或 标量数组
 */
export type EnrollTableFilters = {
  /** 发布部门（单选/多选：兼容 antd 回传数组） */
  department?: string | string[];

  /** 类型（0:活动 / 1:讲座） */
  type?: 0 | 1 | Array<0 | 1>;

  /** 活动状态（0~4，来自 activity.state） */
  state?: 0 | 1 | 2 | 3 | 4 | Array<0 | 1 | 2 | 3 | 4>;

  /** 我的报名状态（前端派生） */
  applyState?: ApplyActionState | ApplyActionState[];

  /** 报名开始时间范围（毫秒时间戳） */
  signStartRange?: [number, number];

  /** 报名结束时间范围（毫秒时间戳） */
  signEndRange?: [number, number];

  /** 活动开始时间范围（毫秒时间戳） */
  activityStartRange?: [number, number];

  /** 活动结束时间范围（毫秒时间戳） */
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

/** filters 值可能是标量或数组，这里做统一判断（兼容 antd FilterValue） */
function matchValue<T>(rowVal: T, filterVal: T | T[] | undefined): boolean {
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

  if (!matchValue(row.department, filters.department as any)) return false;
  if (!matchValue(row.type, filters.type as any)) return false;
  if (!matchValue(row.state, filters.state as any)) return false;
  if (!matchValue(row.applyState, filters.applyState as any)) return false;

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

    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (row as any)[field] ?? null;
  }
}

/** 组装成 localQuery 常用 options */
export function buildLocalQueryOptions() {
  return { getSearchTexts, matchFilters, getSortValue };
}

/* =====================================================
 * 五、筛选项辅助（可选）
 * ===================================================== */

/** 从活动列表中提取部门候选项（若你不想额外请求 /department/allDepartment） */
export function deriveDepartmentOptions(activities: ActivityItem[]) {
  const set = new Set<string>();
  for (const a of activities) {
    if (a.department) set.add(a.department);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
