import React from "react";
import { Button, Dropdown, Popconfirm, Space } from "antd";
import { MoreOutlined } from "@ant-design/icons";

export type ActionItem<T = any> = {
  key: string;
  label: React.ReactNode;
  onClick: (record: T) => void;

  /** 危险操作（红色） */
  danger?: boolean;

  /** 是否禁用 */
  disabled?: boolean;

  /** 是否隐藏 */
  hidden?: boolean;

  /** 二次确认 */
  confirm?: {
    title?: string;
    description?: string;
    okText?: string;
    cancelText?: string;
  };
};

export type ActionCellProps<T = any> = {
  record: T;

  /** 操作定义 */
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
  const visibleActions = actions.filter((a) => !a.hidden);

  const direct = visibleActions.slice(0, maxVisible);
  const more = visibleActions.slice(maxVisible);

  const renderButton = (action: ActionItem<T>) => {
    const btn = (
      <Button
        key={action.key}
        type="link"
        size={size}
        danger={action.danger}
        disabled={action.disabled}
        onClick={() => action.onClick(record)}
      >
        {action.label}
      </Button>
    );

    if (action.confirm) {
      return (
        <Popconfirm
          key={action.key}
          title={action.confirm.title ?? "确认操作？"}
          description={action.confirm.description}
          okText={action.confirm.okText ?? "确认"}
          cancelText={action.confirm.cancelText ?? "取消"}
          onConfirm={() => action.onClick(record)}
        >
          {btn}
        </Popconfirm>
      );
    }

    return btn;
  };

  return (
    <Space size={4}>
      {direct.map(renderButton)}

      {more.length > 0 && (
        <Dropdown
          menu={{
            items: more.map((a) => ({
              key: a.key,
              label: a.confirm ? (
                <Popconfirm
                  title={a.confirm.title ?? "确认操作？"}
                  description={a.confirm.description}
                  okText={a.confirm.okText ?? "确认"}
                  cancelText={a.confirm.cancelText ?? "取消"}
                  onConfirm={() => a.onClick(record)}
                >
                  <span
                    style={{
                      color: a.danger ? "#ff4d4f" : undefined,
                    }}
                  >
                    {a.label}
                  </span>
                </Popconfirm>
              ) : (
                <span
                  onClick={() => a.onClick(record)}
                  style={{
                    color: a.danger ? "#ff4d4f" : undefined,
                  }}
                >
                  {a.label}
                </span>
              ),
            })),
          }}
          trigger={["click"]}
        >
          <Button type="text" size={size} icon={<MoreOutlined />} />
        </Dropdown>
      )}
    </Space>
  );
}
