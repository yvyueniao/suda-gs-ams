// src/shared/components/table/TableToolbar.tsx
/**
 * TableToolbar
 *
 * 职责：
 * - 作为表格上方的“统一工具条容器”
 * - 提供最小可用能力：
 *   1) 关键词搜索（keyword）
 *   2) 刷新 / 重置
 *   3) 左右插槽（标题 / 按钮区）
 *
 * 设计原则：
 * - 只负责布局与基础交互
 * - 不直接操作数据，不关心后端
 * - 行为全部通过 props 回调抛出
 */

import React from "react";
import { Button, Input, Space } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
} from "@ant-design/icons";

export type TableToolbarProps = {
  /** 当前搜索关键字 */
  keyword?: string;

  /** 搜索关键字变化（通常对接 useTableQuery.setKeyword） */
  onKeywordChange?: (keyword?: string) => void;

  /** 点击刷新（通常对接 useTableData.reload） */
  onRefresh?: () => void;

  /** 点击重置（通常对接 useTableQuery.reset） */
  onReset?: () => void;

  /** 左侧区域（标题 / Tabs / 统计信息等） */
  left?: React.ReactNode;

  /** 右侧区域（新增 / 导出 / 批量操作按钮等） */
  right?: React.ReactNode;

  /** 是否显示搜索框 */
  showSearch?: boolean;

  /** className / style 透传 */
  className?: string;
  style?: React.CSSProperties;
};

export function TableToolbar(props: TableToolbarProps) {
  const {
    keyword,
    onKeywordChange,
    onRefresh,
    onReset,
    left,
    right,
    showSearch = false,
    className,
    style,
  } = props;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap", // ✅ 移动端自动换行
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        ...style,
      }}
    >
      {/* 左侧区域 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {left}
      </div>

      {/* 右侧操作区 */}
      <Space wrap>
        {showSearch && (
          <Input
            allowClear
            placeholder="请输入关键词"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => onKeywordChange?.(e.target.value)}
            onPressEnter={(e) =>
              onKeywordChange?.((e.target as HTMLInputElement).value)
            }
            style={{ width: 200 }}
          />
        )}

        {onReset && (
          <Button icon={<UndoOutlined />} onClick={onReset}>
            重置
          </Button>
        )}

        {onRefresh && (
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        )}

        {right}
      </Space>
    </div>
  );
}
