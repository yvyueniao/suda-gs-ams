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
 * ✅ 本次增强（向后兼容）：
 * - 搜索支持两种模式：
 *   - submit：回车/点搜索按钮才触发（适合后端查询，默认）
 *   - change：输入即触发（适合前端本地过滤）
 * - 可选 debounce（仅 change 模式生效）
 * - 统一 loading/disabled 控制
 * - 支持“已选 X 条 + 清空选择”的 selection 区域（给批量操作打基础）
 *
 * ✅ 修复：
 * - 中文输入法 IME（拼音组合输入）导致：
 *   1) 拼音 + 选中字同时触发搜索/过滤（显示异常）
 *   2) 每敲/删一个字就触发一次刷新（过快）
 * 处理方式：
 * - compositionStart ~ compositionEnd 期间不触发 change 搜索
 * - compositionEnd 时再触发一次（走 debounce）
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Space, Typography } from "antd";
import type { InputProps } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

export type TableToolbarProps = {
  /** 当前搜索关键字（外部受控值） */
  keyword?: string;

  /** 搜索关键字变化（兼容旧用法：通常对接 useTableQuery.setKeyword） */
  onKeywordChange?: (keyword?: string) => void;

  /**
   * ✅ 新增：提交式搜索（更适合后端查询）
   * - submit 模式下：回车/点搜索按钮触发
   * - change 模式下：也会触发（等价于 onKeywordChange，但推荐只用一个）
   */
  onSearch?: (keyword: string) => void;

  /** ✅ 新增：搜索触发模式（默认 submit） */
  searchMode?: "submit" | "change";

  /** ✅ 新增：change 模式下的防抖毫秒数（默认 0，不防抖） */
  debounceMs?: number;

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

  /** 搜索框占位文案 */
  searchPlaceholder?: string;

  /** 是否禁用搜索框 */
  searchDisabled?: boolean;

  /** 搜索框宽度（默认 220） */
  searchWidth?: number;

  /** ✅ 新增：整体 loading（统一让按钮 loading + disabled） */
  loading?: boolean;

  /** ✅ 新增：重置/刷新文案 */
  resetText?: string;
  refreshText?: string;

  /** ✅ 新增：重置/刷新禁用控制 */
  resetDisabled?: boolean;
  refreshDisabled?: boolean;

  /** ✅ 新增：批量选择信息区（两种用法二选一即可） */
  selectionInfo?: React.ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;

  /** className / style 透传 */
  className?: string;
  style?: React.CSSProperties;

  /** ✅ 新增：透传给 Input（少量定制用） */
  inputProps?: Omit<InputProps, "value" | "onChange" | "onPressEnter">;
};

function useDebouncedCallback<T extends any[]>(
  cb: ((...args: T) => void) | undefined,
  delayMs: number,
) {
  return useMemo(() => {
    if (!cb) return undefined;
    if (!delayMs || delayMs <= 0) return cb;

    let t: any;
    const fn = (...args: T) => {
      clearTimeout(t);
      t = setTimeout(() => cb(...args), delayMs);
    };

    // 给外面一个 cancel 的机会（可选）
    (fn as any).cancel = () => clearTimeout(t);
    return fn as (...args: T) => void;
  }, [cb, delayMs]);
}

export function TableToolbar(props: TableToolbarProps) {
  const {
    keyword,
    onKeywordChange,
    onSearch,
    searchMode = "submit",
    debounceMs = 0,

    onRefresh,
    onReset,
    left,
    right,

    showSearch = false,
    searchPlaceholder = "请输入关键词",
    searchDisabled = false,
    searchWidth = 220,

    loading = false,
    resetText = "重置",
    refreshText = "刷新",
    resetDisabled = false,
    refreshDisabled = false,

    selectionInfo,
    selectedCount,
    onClearSelection,

    className,
    style,
    inputProps,
  } = props;

  // ✅ 内部输入态（submit 模式下需要“输入中”和“已提交”分离）
  const [inputValue, setInputValue] = useState<string>(keyword ?? "");

  // 外部 keyword 变化时同步到输入框（避免外部 reset 后输入框不更新）
  useEffect(() => {
    setInputValue(keyword ?? "");
  }, [keyword]);

  // ✅ IME 组合输入标记（拼音输入阶段不要触发 change 搜索）
  const composingRef = useRef(false);

  const debouncedKeywordChange = useDebouncedCallback<[string]>(
    (kw) => onKeywordChange?.(kw),
    debounceMs,
  );
  const debouncedSearch = useDebouncedCallback<[string]>(
    (kw) => onSearch?.(kw),
    debounceMs,
  );

  const effectiveSearchDisabled = loading || searchDisabled;

  const triggerSearch = (
    kwRaw: string,
    opts?: { bypassDebounce?: boolean },
  ) => {
    const kw = kwRaw ?? "";

    // ✅ submit 或 “强制立即触发” 时：绕过 debounce（例如点击搜索按钮）
    if (opts?.bypassDebounce && debounceMs > 0) {
      (debouncedKeywordChange as any)?.cancel?.();
      (debouncedSearch as any)?.cancel?.();
    }

    onKeywordChange?.(kw);
    onSearch?.(kw);
  };

  const emitChangeMode = (kw: string) => {
    if (debounceMs > 0) {
      debouncedKeywordChange?.(kw);
      debouncedSearch?.(kw);
    } else {
      onKeywordChange?.(kw);
      onSearch?.(kw);
    }
  };

  const handleInputChange = (v: string) => {
    setInputValue(v);

    if (searchMode !== "change") return;
    if (composingRef.current) return; // ✅ 拼音阶段不触发（解决“拼音+中文都显示”）

    emitChangeMode(v);
  };

  const handleSubmit = () => {
    // submit 模式：回车/点按钮才触发
    // change 模式：点按钮等价于“立即触发一次”（绕过防抖）
    triggerSearch(inputValue, { bypassDebounce: true });
  };

  const renderSelection = () => {
    if (selectionInfo) return selectionInfo;

    const count = typeof selectedCount === "number" ? selectedCount : 0;
    if (!count) return null;

    return (
      <Space size={8}>
        <Typography.Text type="secondary">已选 {count} 条</Typography.Text>
        {onClearSelection ? (
          <Button
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={onClearSelection}
            disabled={loading}
          >
            清空
          </Button>
        ) : null}
      </Space>
    );
  };

  const selectionNode = renderSelection();

  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        ...style,
      }}
    >
      {/* 左侧区域 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {left}
        {selectionNode}
      </div>

      {/* 右侧操作区 */}
      <Space wrap>
        {showSearch && (
          <Input
            allowClear
            disabled={effectiveSearchDisabled}
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onPressEnter={handleSubmit}
            // ✅ IME：拼音开始/结束
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;

              // ✅ 选字结束：如果是 change 模式，这里再触发一次（走 debounce）
              if (searchMode === "change") {
                emitChangeMode(e.currentTarget.value);
              }
            }}
            style={{ width: searchWidth }}
            suffix={
              // submit 模式下提供一个“明确的触发点”，change 模式也可点（立即触发一次）
              <Button
                type="text"
                icon={<SearchOutlined />}
                onClick={handleSubmit}
                disabled={effectiveSearchDisabled}
              />
            }
            {...inputProps}
          />
        )}

        {onReset && (
          <Button
            icon={<UndoOutlined />}
            onClick={onReset}
            disabled={loading || resetDisabled}
          >
            {resetText}
          </Button>
        )}

        {onRefresh && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            disabled={loading || refreshDisabled}
            loading={loading}
          >
            {refreshText}
          </Button>
        )}

        {right}
      </Space>
    </div>
  );
}
