/**
 * ============================================
 * shared/utils/datetime
 * ============================================
 *
 * 文件定位：
 * - shared 基础工具层
 * - 仅提供“纯时间处理函数”
 * - 不包含任何业务语义（例如：取消规则）
 *
 * 设计原则：
 * 1) ✅ 纯函数
 * 2) ✅ 无业务耦合
 * 3) ✅ 可被任意模块复用（activity/profile/org 等）
 *
 * 当前提供：
 * - parseTimeMs：后端时间字符串 → 时间戳
 * - isInTimeWindow：判断当前时间是否落在区间内
 *
 * ❌ 已删除：
 * - canCancelBeforeHours（取消 12 小时限制）
 */

/**
 * 后端时间格式：
 *   "YYYY-MM-DD HH:mm:ss"
 *
 * 为避免不同浏览器解析差异，
 * 统一替换为空格 → "T"
 *
 * 示例：
 *   2026-02-01 09:30:00
 *   ↓
 *   2026-02-01T09:30:00
 *
 * 返回：
 * - number 时间戳
 * - null   解析失败
 */
export function parseTimeMs(s?: string): number | null {
  if (!s) return null;

  const isoLike = s.replace(" ", "T");
  const t = Date.parse(isoLike);

  return Number.isNaN(t) ? null : t;
}

/**
 * 判断当前时间是否落在时间窗口内（含边界）
 *
 * @param startTime 开始时间字符串
 * @param endTime   结束时间字符串
 * @param nowMs     当前时间戳
 *
 * 返回：
 * - true  → 在时间区间内
 * - false → 不在区间
 */
export function isInTimeWindow(
  startTime?: string,
  endTime?: string,
  nowMs: number = Date.now(),
): boolean {
  const start = parseTimeMs(startTime);
  const end = parseTimeMs(endTime);

  if (start == null || end == null) return false;

  return nowMs >= start && nowMs <= end;
}
