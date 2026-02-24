//src\main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

import App from "./App";
import { appTheme } from "./app/theme/theme";

// ✅ Sentry（错误 + 性能）初始化
import { initSentry } from "./app/telemetry/sentry";

import "antd/dist/reset.css";
import "./app/styles/auth.css";
import "./app/styles/layout.css";
import "./app/styles/feedback.css";
import "./app/styles/profile.css";
import "./app/styles/activity-admin.css";
import "./app/styles/activity-apply.css";
import "./app/styles/ty.css";

// ✅ 关键：让 DatePicker 面板里的月份/周几也变中文
dayjs.locale("zh-cn");

// ✅ 必须在 render 之前初始化（尽早捕获错误/性能）
initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={appTheme}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
