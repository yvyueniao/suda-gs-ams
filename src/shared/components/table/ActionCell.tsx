// src/shared/components/table/ActionCell.tsx
/**
 * ActionCell
 *
 * ✅ 文件定位
 * - 表格“操作列”的通用渲染器（纯 UI + 触发器）
 *
 * ✅ 负责什么
 * 1) 渲染：前 N 个操作按钮 + “更多”下拉菜单
 * 2) 二次确认：统一走 confirmAsync（await 风格），避免 Popconfirm 嵌 Dropdown 不稳定
 * 3) 触发动作：执行 action.onClick(record)
 *
 * ✅ 不负责什么（保持解耦）
 * - 不做 message/toast（交给页面或 shared/actions）
 * - 不做异步编排（如：全局 loading、防重复、错误兜底），仅消费业务侧传入的 loading/disabled
 *
 * ✅ 关键类型修复（解决 Promise<unknown> -> Promise<void> 报错）
 * - ActionCell 不需要消费 onClick 的返回值，所以不应该强约束 Promise<void>
 * - 允许 onClick 返回 Promise<unknown>，以兼容各种业务函数（可能返回 data / msg / unknown）
 */

import React from "react";
import { Button, Dropdown, Space } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import { confirmAsync } from "../../ui/confirmAsync";

export type ActionItem<T = any> = {
  /** 唯一 key（用于 React 渲染 + Dropdown 选中） */
  key: string;

  /** 按钮文本/节点 */
  label: React.ReactNode;

  /**
   * 点击动作
   * ✅ 允许返回 Promise<unknown>
   * - ActionCell 只负责触发与 await（保证时序），不消费返回值
   * - 避免业务侧 Promise<unknown> 与 Promise<void> 不兼容
   */
  onClick: (record: T) => void | Promise<unknown>;

  /** 危险操作（红色样式 + confirm 弹窗危险按钮） */
  danger?: boolean;

  /** 是否禁用 */
  disabled?: boolean;

  /** 是否 loading（建议业务侧用 action.isLoading(id) 注入） */
  loading?: boolean;

  /** 是否隐藏 */
  hidden?: boolean;

  /**
   * 二次确认
   * - 建议统一走 confirmAsync（await 风格）
   * - 避免 Popconfirm 嵌在 Dropdown menu 里导致交互不稳定
   */
  confirm?: {
    title?: React.ReactNode;
    content?: React.ReactNode;
    okText?: string;
    cancelText?: string;
  };
};

export type ActionCellProps<T = any> = {
  /** 当前行数据 */
  record: T;

  /** 操作定义数组 */
  actions: ActionItem<T>[];

  /** 最多直接显示几个，其余进“更多” */
  maxVisible?: number;

  /** 按钮尺寸 */
  size?: "small" | "middle";
};

export function ActionCell<T>({
  record,
  actions,
  maxVisible = 2,
  size = "small",
}: ActionCellProps<T>) {
  // 过滤掉隐藏项（hidden=true）
  const visibleActions = actions.filter((a) => !a.hidden);

  // 前 maxVisible 个直接渲染为按钮，其余进入 “更多” 下拉
  const direct = visibleActions.slice(0, maxVisible);
  const more = visibleActions.slice(maxVisible);

  /**
   * handleClick(action)
   *
   * 统一点击入口：
   * - disabled/loading 直接拦截
   * - 若配置 confirm：先 await confirmAsync
   * - 最后执行 action.onClick(record)
   */
  const handleClick = async (action: ActionItem<T>) => {
    // 1) 禁用 / 正在执行：直接拦截（避免重复触发）
    if (action.disabled || action.loading) return;

    // 2) 二次确认：先确认再执行
    if (action.confirm) {
      const ok = await confirmAsync({
        title: action.confirm.title ?? "确认操作？",
        content: action.confirm.content,
        okText: action.confirm.okText ?? "确认",
        cancelText: action.confirm.cancelText ?? "取消",
        danger: !!action.danger,
      });

      if (!ok) return;
    }

    // 3) 执行动作（不关心返回值，但需要 await 保证顺序）
    await action.onClick(record);
  };

  /**
   * renderButton：渲染单个操作按钮
   */
  const renderButton = (action: ActionItem<T>) => {
    return (
      <Button
        key={action.key}
        type="link"
        size={size}
        danger={action.danger}
        disabled={action.disabled}
        loading={action.loading}
        onClick={() => void handleClick(action)}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <Space size={4}>
      {/* 直接展示的按钮 */}
      {direct.map(renderButton)}

      {/* 超出 maxVisible 的操作进入更多菜单 */}
      {more.length > 0 && (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: more.map((a) => ({
              key: a.key,
              disabled: a.disabled,
              label: (
                <span style={{ color: a.danger ? "#ff4d4f" : undefined }}>
                  {a.label}
                </span>
              ),
            })),
            onClick: ({ key }) => {
              const action = more.find((x) => x.key === key);
              if (!action) return;
              void handleClick(action);
            },
          }}
        >
          <Button type="text" size={size} icon={<MoreOutlined />} />
        </Dropdown>
      )}
    </Space>
  );
}
