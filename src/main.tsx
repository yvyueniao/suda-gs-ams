// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

import App from "./App";

// ✅ 主题系统（默认主题 + 用户可配置覆盖层）
import { ThemeProvider } from "./app/theme/ThemeProvider";

// ✅ Sentry（错误 + 性能）初始化
import { initSentry } from "./app/telemetry/sentry";

// ✅ React 渲染期错误兜底（防白屏 + 上报 Sentry）
import { ErrorBoundary } from "./app/telemetry/ErrorBoundary";

import "antd/dist/reset.css";
import "./app/styles/auth.css";
import "./app/styles/layout.css";
import "./app/styles/feedback.css";
import "./app/styles/profile.css";
import "./app/styles/activity-admin.css";
import "./app/styles/activity-apply.css";

// ✅ 关键：让 DatePicker 面板里的月份/周几也变中文
dayjs.locale("zh-cn");

// ✅ 必须在 render 之前初始化（尽早捕获错误/性能）
initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* ✅ locale 仍由 ConfigProvider 提供；主题由 ThemeProvider 接管 */}
      <ConfigProvider locale={zhCN}>
        <ThemeProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
