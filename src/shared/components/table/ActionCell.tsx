// src/shared/components/table/ActionCell.tsx
import React from "react";
import { Button, Dropdown, Space } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import { confirmAsync } from "../../ui/confirmAsync";

export type ActionItem<T = any> = {
  key: string;
  label: React.ReactNode;
  onClick: (record: T) => void | Promise<unknown>;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  confirm?: {
    title?: React.ReactNode;
    content?: React.ReactNode;
    okText?: string;
    cancelText?: string;
  };
};

export type ActionCellProps<T = any> = {
  record: T;
  actions: ActionItem<T>[];
  maxVisible?: number;
  size?: "small" | "middle";

  /** ✅ 新增：更紧凑的操作列（默认 true） */
  compact?: boolean;
};

export function ActionCell<T>({
  record,
  actions,
  maxVisible = 2,
  size = "small",
  compact = true,
}: ActionCellProps<T>) {
  const visibleActions = actions.filter((a) => !a.hidden);
  const direct = visibleActions.slice(0, maxVisible);
  const more = visibleActions.slice(maxVisible);

  const handleClick = async (action: ActionItem<T>) => {
    if (action.disabled || action.loading) return;

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

    await action.onClick(record);
  };

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
        // ✅ 关键：去掉 link 按钮左右 padding，让它更像“文字”
        style={
          compact
            ? {
                paddingInline: 4,
                height: "auto",
                lineHeight: 1.2,
              }
            : undefined
        }
      >
        {action.label}
      </Button>
    );
  };

  return (
    <Space
      size={compact ? 0 : 4}
      wrap={false}
      style={
        compact
          ? {
              whiteSpace: "nowrap",
              gap: 4, // ✅ 用 gap 控制间距，比 Space size 更直观
            }
          : { whiteSpace: "nowrap" }
      }
    >
      {direct.map(renderButton)}

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
          <Button
            type="text"
            size={size}
            icon={<MoreOutlined />}
            // ✅ 关键：更多按钮也收紧
            style={
              compact ? { paddingInline: 4, width: 28, height: 24 } : undefined
            }
          />
        </Dropdown>
      )}
    </Space>
  );
}
