// src/app/theme/theme.ts
import type { ThemeConfig } from "antd";

const BRAND_PRIMARY = import.meta.env.VITE_BRAND_PRIMARY || "#5B8FF9";
const FONT_SCALE = Number(import.meta.env.VITE_FONT_SCALE ?? 1);
const RADIUS_SCALE = Number(import.meta.env.VITE_RADIUS_SCALE ?? 1);
const CONTROL_SCALE = Number(import.meta.env.VITE_CONTROL_SCALE ?? 1);

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.4, Math.max(0.8, n));
}

function toGrid(value: number): number {
  // 锁定为 4 的倍数
  return Math.max(4, Math.round(value / 4) * 4);
}

const fs = clampScale(FONT_SCALE);
const rs = clampScale(RADIUS_SCALE);
const cs = clampScale(CONTROL_SCALE);

/**
 * suda-gs-ams 统一主题配置（A：清爽轻后台）
 *
 * 设计目标：
 * - 清爽：浅主色 + 更轻的背景与边框
 * - 不显胖：控件高度接近 antd 默认（避免输入框/搜索框“变大一号”）
 * - 仍有质感：卡片轻阴影 + 统一圆角
 *
 * ✅ 你之前“列表搜索框大一号”的原因：
 * - token.controlHeight 设成了 40（默认约 32）
 * - 这里下调到 34/32 档位，整体立刻变紧凑、清爽
 */

export const appTheme: ThemeConfig = {
  token: {
    /**
     * ========= 基础色彩（清爽浅色系）=========
     */
    colorPrimary: BRAND_PRIMARY, // 支持配置品牌主色
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",

    /**
     * ========= 背景体系（更“干净”的灰白）=========
     */
    colorBgLayout: "#F6F8FC", // 页面整体背景：更浅更干净
    colorBgContainer: "#FFFFFF", // Card/Container 背景
    colorBorder: "#E6EAF2", // 边框更浅，减少“厚重感”

    /**
     * ========= 圆角体系 =========
     */
    borderRadius: toGrid(10 * rs),
    borderRadiusLG: toGrid(16 * rs),
    borderRadiusSM: toGrid(8 * rs),

    /**
     * ========= 字体体系 =========
     */
    fontSize: toGrid(14 * fs),
    fontSizeLG: toGrid(16 * fs),
    fontSizeSM: toGrid(12 * fs),
    lineHeight: 1.6,

    /**
     * ========= 控件高度（关键：让搜索框不再“大一号”）=========
     * antd 默认控件高度较接近 32
     * 这里给一个“略舒适但不臃肿”的档位
     */
    controlHeight: toGrid(40 * cs),
    controlHeightLG: toGrid(44 * cs),
    controlHeightSM: toGrid(32 * cs),

    /**
     * ========= 阴影体系（轻质感，不压）=========
     * 注意：boxShadow token 会影响多个组件的默认投影基调
     * 这里尽量“轻、散、柔”
     */
    boxShadow: `
      0 6px 18px rgba(17, 24, 39, 0.06),
      0 2px 6px rgba(17, 24, 39, 0.04)
    `,
  },

  components: {
    /**
     * Card：保持质感但更轻，不要太“胖”
     */
    Card: {
      borderRadiusLG: toGrid(16 * rs),
      paddingLG: toGrid(24 * fs),
      boxShadow: `
        0 10px 28px rgba(17, 24, 39, 0.08),
        0 4px 10px rgba(17, 24, 39, 0.06)
      `,
    },

    /**
     * Button：保持好看，别太大
     */
    Button: {
      borderRadius: toGrid(10 * rs),
      controlHeight: toGrid(40 * cs),
      controlHeightLG: toGrid(44 * cs),
      controlHeightSM: toGrid(32 * cs),
    },

    /**
     * Input：圆角统一，大小跟随 token.controlHeight
     */
    Input: {
      borderRadius: toGrid(10 * rs),
      controlHeight: toGrid(40 * cs),
      controlHeightLG: toGrid(44 * cs),
      controlHeightSM: toGrid(32 * cs),
    },

    /**
     * Table：表头更清爽、边框更浅
     */
    Table: {
      headerBg: "#e5e6ec",
      headerColor: "#1f1f1f",
      borderColor: "#E9EDF5",
    },

    Modal: {
      borderRadiusLG: toGrid(16 * rs),
    },

    Drawer: {
      borderRadiusLG: toGrid(16 * rs),
    },
  },
};
