// src/app/theme/theme.ts
import type { ThemeConfig } from "antd";

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
    colorPrimary: "#5B8FF9", // 清爽浅蓝（后台常用、观感高级）
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
    borderRadius: 12, // 全局主圆角（Card/Modal/Input）
    borderRadiusLG: 16,
    borderRadiusSM: 8,

    /**
     * ========= 字体体系 =========
     */
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    lineHeight: 1.6,

    /**
     * ========= 控件高度（关键：让搜索框不再“大一号”）=========
     * antd 默认控件高度较接近 32
     * 这里给一个“略舒适但不臃肿”的档位
     */
    controlHeight: 34,
    controlHeightLG: 38,
    controlHeightSM: 28,

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
      borderRadiusLG: 16,
      paddingLG: 20, // 由 24 下调，避免页面整体显得臃肿
      boxShadow: `
        0 10px 28px rgba(17, 24, 39, 0.08),
        0 4px 10px rgba(17, 24, 39, 0.06)
      `,
    },

    /**
     * Button：保持好看，别太大
     */
    Button: {
      borderRadius: 10,
      controlHeight: 34,
      controlHeightLG: 38,
      controlHeightSM: 28,
    },

    /**
     * Input：圆角统一，大小跟随 token.controlHeight
     */
    Input: {
      borderRadius: 10,
      controlHeight: 34,
      controlHeightLG: 38,
      controlHeightSM: 28,
    },

    /**
     * Table：表头更清爽、边框更浅
     */
    Table: {
      headerBg: "#F7F9FD",
      headerColor: "#1f1f1f",
      borderColor: "#E9EDF5",
    },

    Modal: {
      borderRadiusLG: 16,
    },

    Drawer: {
      borderRadiusLG: 16,
    },
  },
};
