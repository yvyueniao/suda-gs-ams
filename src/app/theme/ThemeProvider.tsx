// src/app/theme/ThemeProvider.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

import { appTheme } from "./theme";
import {
  loadThemePrefs,
  saveThemePrefs,
  prefsToThemePatch,
  DEFAULT_THEME_PREFS,
  type ThemePrefs,
} from "../../shared/theme/prefs";

/**
 * =========================================================
 * Context
 * =========================================================
 */

type ThemeContextValue = {
  prefs: ThemePrefs;
  setPrefs: (next: ThemePrefs) => void;
  reset: () => void;
};

const ThemePrefsContext = React.createContext<ThemeContextValue | null>(null);

/**
 * =========================================================
 * 工具：合并 ThemeConfig
 * - 只做浅合并（token + components）
 * - algorithm 单独控制
 * =========================================================
 */
function mergeTheme(base: ThemeConfig, patch: ThemeConfig): ThemeConfig {
  return {
    token: {
      ...(base.token ?? {}),
      ...(patch.token ?? {}),
    },
    components: {
      ...(base.components ?? {}),
      ...(patch.components ?? {}),
    },
  };
}

/**
 * =========================================================
 * ThemeProvider
 * =========================================================
 */
export function ThemeProvider(props: { children: React.ReactNode }) {
  /**
   * 读取本地偏好
   */
  const [prefs, setPrefsState] = useState<ThemePrefs>(() => loadThemePrefs());

  /**
   * ✅ 同步到 DOM（给 CSS 变量切换使用）
   * - layout.css / auth.css 等用 body[data-theme="xxx"] 覆盖变量
   */
  useEffect(() => {
    document.body.dataset.theme = prefs.mode; // "light" | "soft" | "dark"
  }, [prefs.mode]);

  /**
   * 设置偏好（自动持久化）
   */
  const setPrefs = (next: ThemePrefs) => {
    setPrefsState(next);
    saveThemePrefs(next);
  };

  /**
   * 恢复默认
   */
  const reset = () => {
    setPrefsState(DEFAULT_THEME_PREFS);
    saveThemePrefs(DEFAULT_THEME_PREFS);
  };

  /**
   * 根据偏好生成 patch
   */
  const patch = useMemo(() => prefsToThemePatch(prefs), [prefs]);

  /**
   * 合并默认主题 + patch
   */
  const mergedTheme = useMemo(() => mergeTheme(appTheme, patch), [patch]);

  /**
   * algorithm：浅色 / 深色
   * - soft：仍然走浅色算法，仅通过 token patch 降低亮度/对比度
   */
  const algorithm = useMemo(() => {
    return prefs.mode === "dark"
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm;
  }, [prefs.mode]);

  /**
   * 组件尺寸（密度）三档：紧凑 / 默认 / 宽松
   */
  const componentSize = useMemo(() => {
    if (prefs.density === "compact") return "small";
    if (prefs.density === "comfortable") return "large";
    return "middle"; // default
  }, [prefs.density]);

  const contextValue: ThemeContextValue = {
    prefs,
    setPrefs,
    reset,
  };

  return (
    <ThemePrefsContext.Provider value={contextValue}>
      <ConfigProvider
        theme={{
          ...mergedTheme,
          algorithm,
        }}
        componentSize={componentSize}
      >
        {props.children}
      </ConfigProvider>
    </ThemePrefsContext.Provider>
  );
}

/**
 * =========================================================
 * Hook
 * =========================================================
 */
export function useThemePrefs() {
  const ctx = React.useContext(ThemePrefsContext);
  if (!ctx) {
    throw new Error("useThemePrefs must be used within ThemeProvider");
  }
  return ctx;
}
