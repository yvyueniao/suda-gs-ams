// src/shared/theme/prefs.ts
import type { ThemeConfig } from "antd";

/**
 * =========================================================
 * 主题偏好模型（用户可配置）
 * =========================================================
 */

export type ThemeMode = "light" | "dark";

/**
 * ✅ 组件尺寸（密度）三档
 * - compact:    更紧凑（small）
 * - default:    默认（middle）
 * - comfortable 更宽松（large）
 */
export type ThemeDensity = "compact" | "default" | "comfortable";

export type ThemePrefs = {
  /** 主题模式 */
  mode: ThemeMode;

  /** 主色 */
  primaryColor: string;

  /** ✅ 布局/组件密度（三档） */
  density: ThemeDensity;

  /** 全局圆角 */
  radius: number;

  /** 全局基础字号 */
  fontSize: number;
};

/**
 * 默认主题偏好
 */
export const DEFAULT_THEME_PREFS: ThemePrefs = {
  mode: "light",
  primaryColor: "#5B8FF9",
  density: "default",
  radius: 12,
  fontSize: 14,
};

/**
 * localStorage key
 */
const STORAGE_KEY = "suda.theme.prefs.v1";

/**
 * =========================================================
 * 读取主题偏好
 * - 解析失败自动回退默认值
 * - ✅ 兼容旧字段 compact:boolean -> density
 * - 保证返回结构完整
 * =========================================================
 */
export function loadThemePrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_PREFS;

    const parsed = JSON.parse(raw) as any;

    // ✅ 兼容旧字段：compact:boolean
    const density: ThemeDensity =
      typeof parsed?.compact === "boolean"
        ? parsed.compact
          ? "compact"
          : "default"
        : ((parsed?.density as ThemeDensity) ?? DEFAULT_THEME_PREFS.density);

    // ✅ mode 容错（只允许 light/dark）
    const mode: ThemeMode = parsed?.mode === "dark" ? "dark" : "light";

    // ✅ density 容错
    const safeDensity: ThemeDensity =
      density === "compact" ||
      density === "default" ||
      density === "comfortable"
        ? density
        : DEFAULT_THEME_PREFS.density;

    return {
      ...DEFAULT_THEME_PREFS,
      ...parsed,
      mode,
      density: safeDensity,
      primaryColor: String(
        parsed?.primaryColor ?? DEFAULT_THEME_PREFS.primaryColor,
      ),
      radius: Number(parsed?.radius ?? DEFAULT_THEME_PREFS.radius),
      fontSize: Number(parsed?.fontSize ?? DEFAULT_THEME_PREFS.fontSize),
    };
  } catch {
    return DEFAULT_THEME_PREFS;
  }
}

/**
 * 保存主题偏好
 */
export function saveThemePrefs(prefs: ThemePrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 忽略写入失败（隐私模式等情况）
  }
}

/**
 * =========================================================
 * 把用户偏好转换为 antd ThemeConfig patch
 * - 只生成“覆盖层”
 * - 不覆盖 appTheme 的全部结构
 *
 * ✅ 密度三档策略：
 * - small/middle/large 主要由 ThemeProvider 的 componentSize 控制
 * - 这里再轻量调一下 token.controlHeight，让“体感更明显且稳定”
 * =========================================================
 */
export function prefsToThemePatch(prefs: ThemePrefs): ThemeConfig {
  const isDark = prefs.mode === "dark";

  // ✅ 让密度三档在“高度”上更可感知（不要太夸张）
  // - 注意：这只是 token 兜底；最终尺寸仍以 ThemeProvider 的 componentSize 为准
  const densityHeights =
    prefs.density === "compact"
      ? { controlHeight: 32, controlHeightLG: 36, controlHeightSM: 28 }
      : prefs.density === "comfortable"
        ? { controlHeight: 38, controlHeightLG: 42, controlHeightSM: 32 }
        : {}; // default：不覆盖，沿用 appTheme

  return {
    token: {
      /**
       * 主色
       */
      colorPrimary: prefs.primaryColor,

      /**
       * 基础字号 / 圆角
       */
      fontSize: prefs.fontSize,
      borderRadius: prefs.radius,

      // ✅ 让圆角“体感更一致”（可选，但通常更好看）
      borderRadiusSM: Math.max(4, prefs.radius - 4),
      borderRadiusLG: prefs.radius + 4,

      /**
       * 背景体系（模式切换）
       */
      colorBgLayout: isDark ? "#0B1220" : "#F6F8FC",
      colorBgContainer: isDark ? "#0F172A" : "#FFFFFF",
      colorBorder: isDark ? "rgba(255,255,255,0.12)" : "#E6EAF2",

      /**
       * 文本体系
       */
      colorText: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.88)",
      colorTextSecondary: isDark
        ? "rgba(255,255,255,0.60)"
        : "rgba(0,0,0,0.55)",

      /**
       * 密度高度（轻量覆盖）
       */
      ...densityHeights,
    },

    /**
     * 组件级覆盖（只覆盖必要部分）
     */
    components: {
      Table: {
        headerBg: isDark ? "#111827" : "#e5e6ec",
        headerColor: isDark ? "rgba(255,255,255,0.88)" : "#1f1f1f",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E9EDF5",
      },
    },
  };
}
