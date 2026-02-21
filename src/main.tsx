import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";

import App from "./App";
import { appTheme } from "./app/theme/theme";

import "antd/dist/reset.css";
import "./app/styles/auth.css";
import "./app/styles/layout.css";
import "./app/styles/feedback.css";
import "./app/styles/profile.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={appTheme}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
