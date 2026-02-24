//src\app\telemetry\ErrorBoundary.tsx
import React from "react";
import * as Sentry from "@sentry/react";
import { Button, Result } from "antd";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

/**
 * ErrorBoundary
 *
 * 作用：
 * - 捕获 React 渲染期错误（render / lifecycle / constructor）
 * - 上报到 Sentry
 * - 展示降级 UI，避免白屏
 *
 * 注意：
 * - 不捕获事件处理函数里的错误（那些会被 Sentry 自动捕获）
 * - 不捕获 async promise 错误（那些由 http 层处理）
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  /**
   * 渲染阶段错误 → 更新 UI 状态
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * 组件捕获到错误时
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ✅ 上报到 Sentry
    Sentry.captureException(error, {
      tags: {
        layer: "react",
        boundary: "root",
      },
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  /**
   * 重置错误状态（重试按钮用）
   */
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面发生异常"
          subTitle="系统已自动记录该问题，请稍后重试或联系管理员。"
          extra={[
            <Button type="primary" key="retry" onClick={this.handleRetry}>
              重新加载
            </Button>,
            <Button
              key="home"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              返回首页
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}
