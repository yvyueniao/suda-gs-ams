// src/shared/components/table/ColumnSettings.tsx
/**
 * ColumnSettings（受控版 · 纯 UI）
 *
 * 职责：
 * - 提供“列设置”按钮 + 弹窗
 * - 勾选显示/隐藏列
 *
 * 注意：
 * - 不负责持久化（localStorage）
 * - 持久化与默认值逻辑交给 useColumnPrefs 统一管理
 *
 * 用法：
 * <ColumnSettings
 *   presets={columnPresets}
 *   visibleKeys={visibleKeys}
 *   onChange={setVisibleKeys}
 *   onReset={resetToDefault}
 * />
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Modal,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import type { TableColumnPreset } from "./types";

export type ColumnSettingsProps<T extends object = any> = {
  presets: TableColumnPreset<T>[];

  /** 当前可见列 key（受控） */
  visibleKeys: string[];

  /** 修改可见列 key（受控回调） */
  onChange: (keys: string[]) => void;

  /** 恢复默认（可选） */
  onReset?: () => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 按钮文本 */
  buttonText?: string;

  className?: string;
  style?: React.CSSProperties;
};

export function ColumnSettings<T extends object = any>(
  props: ColumnSettingsProps<T>,
) {
  const {
    presets,
    visibleKeys,
    onChange,
    onReset,
    disabled,
    buttonText = "列设置",
    className,
    style,
  } = props;

  const [open, setOpen] = useState(false);

  const allKeys = useMemo(() => presets.map((p) => p.key), [presets]);

  // key -> title
  const titleMap = useMemo(() => {
    const m = new Map<string, string>();
    presets.forEach((p) => m.set(p.key, p.title));
    return m;
  }, [presets]);

  // 弹窗内草稿（不影响外部，点“保存”才提交）
  const [draftVisibleKeys, setDraftVisibleKeys] =
    useState<string[]>(visibleKeys);

  const openModal = useCallback(() => {
    // 打开时用外部状态同步一份草稿
    setDraftVisibleKeys(visibleKeys);
    setOpen(true);
  }, [visibleKeys]);

  const closeModal = useCallback(() => setOpen(false), []);

  const handleSelectAll = useCallback(() => {
    setDraftVisibleKeys(allKeys);
  }, [allKeys]);

  const handleSelectNone = useCallback(() => {
    setDraftVisibleKeys([]);
  }, []);

  const handleResetDefault = useCallback(() => {
    // ✅ 直接走外部 reset（useColumnPrefs 会负责恢复默认 + 持久化）
    onReset?.();
    setOpen(false);
  }, [onReset]);

  const handleOk = useCallback(() => {
    // 只提交当前 presets 还存在的 key，避免脏数据
    const next = draftVisibleKeys.filter((k) => allKeys.includes(k));
    onChange(next);
    setOpen(false);
  }, [allKeys, draftVisibleKeys, onChange]);

  const indeterminate =
    draftVisibleKeys.length > 0 && draftVisibleKeys.length < allKeys.length;
  const allChecked =
    allKeys.length > 0 && draftVisibleKeys.length === allKeys.length;

  return (
    <>
      <Tooltip title="选择要显示的列">
        <Button
          icon={<SettingOutlined />}
          onClick={openModal}
          disabled={disabled || presets.length === 0}
          className={className}
          style={style}
        >
          {buttonText}
        </Button>
      </Tooltip>

      <Modal
        title="列设置"
        open={open}
        onCancel={closeModal}
        onOk={handleOk}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Checkbox
              indeterminate={indeterminate}
              checked={allChecked}
              onChange={(e) =>
                e.target.checked ? handleSelectAll() : handleSelectNone()
              }
            >
              全选
            </Checkbox>

            <Space>
              <Button size="small" onClick={handleSelectAll}>
                全选
              </Button>
              <Button size="small" onClick={handleSelectNone}>
                全不选
              </Button>
              {onReset && (
                <Button size="small" onClick={handleResetDefault}>
                  恢复默认
                </Button>
              )}
            </Space>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <Checkbox.Group
            style={{ width: "100%" }}
            value={draftVisibleKeys}
            onChange={(vals) => setDraftVisibleKeys(vals as string[])}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {allKeys.map((k) => (
                <Checkbox key={k} value={k}>
                  <Typography.Text>{titleMap.get(k) ?? k}</Typography.Text>
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            提示：列显示偏好由 useColumnPrefs 负责记住（localStorage）。
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
