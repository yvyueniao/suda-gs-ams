// src/shared/components/table/ColumnSettings.tsx
/**
 * ColumnSettings（受控版 · 纯 UI）
 *
 * ✅ 新增：列顺序排序（上移/下移）
 * - orderedKeys：presets 全量顺序（含隐藏列）
 * - onOrderChange：保存时提交顺序
 *
 * 注意：
 * - 不负责持久化（交给 useColumnPrefs）
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
import {
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import type { TableColumnPreset } from "./types";

export type ColumnSettingsProps<T extends object = any> = {
  presets: TableColumnPreset<T>[];

  /** 当前可见列 key（受控） */
  visibleKeys: string[];

  /** 修改可见列 key（受控回调） */
  onChange: (keys: string[]) => void;

  /** ✅ 新增：当前列顺序（presets 全量 keys，含隐藏列） */
  orderedKeys?: string[];

  /** ✅ 新增：修改列顺序（受控回调） */
  onOrderChange?: (keys: string[]) => void;

  /** 恢复默认（可选） */
  onReset?: () => void;

  disabled?: boolean;
  buttonText?: string;

  className?: string;
  style?: React.CSSProperties;
};

function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of arr) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function ColumnSettings<T extends object = any>(
  props: ColumnSettingsProps<T>,
) {
  const {
    presets,
    visibleKeys,
    onChange,
    orderedKeys,
    onOrderChange,
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

  // ✅ 以 orderedKeys 为准（若未传，退化为 presets 顺序）
  const resolvedOrderedKeys = useMemo(() => {
    const base = orderedKeys?.length ? orderedKeys : allKeys;
    const cleaned = uniqKeepOrder(base.filter((k) => allKeys.includes(k)));
    const rest = allKeys.filter((k) => !cleaned.includes(k));
    return [...cleaned, ...rest];
  }, [allKeys, orderedKeys]);

  // 弹窗内草稿：可见 + 顺序
  const [draftVisibleKeys, setDraftVisibleKeys] =
    useState<string[]>(visibleKeys);
  const [draftOrderKeys, setDraftOrderKeys] =
    useState<string[]>(resolvedOrderedKeys);

  const openModal = useCallback(() => {
    // ✅ 每次打开都从 props 同步最新值（避免旧草稿残留）
    setDraftVisibleKeys(visibleKeys);
    setDraftOrderKeys(resolvedOrderedKeys);
    setOpen(true);
  }, [resolvedOrderedKeys, visibleKeys]);

  const closeModal = useCallback(() => setOpen(false), []);

  const handleSelectAll = useCallback(() => {
    setDraftVisibleKeys(allKeys);
  }, [allKeys]);

  const handleSelectNone = useCallback(() => {
    setDraftVisibleKeys([]);
  }, []);

  const handleToggleVisible = useCallback((key: string, checked: boolean) => {
    setDraftVisibleKeys((prev) => {
      const set = new Set(prev);
      if (checked) set.add(key);
      else set.delete(key);
      // 保持“可见列的顺序”不重要：最终保存时会按 draftOrderKeys 重新排序
      return Array.from(set);
    });
  }, []);

  const move = useCallback((key: string, dir: -1 | 1) => {
    setDraftOrderKeys((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[nextIdx];
      next[nextIdx] = tmp;
      return next;
    });
  }, []);

  const handleResetDefault = useCallback(() => {
    onReset?.();
    setOpen(false);
  }, [onReset]);

  const handleOk = useCallback(() => {
    // 只提交当前 presets 还存在的 key，避免脏数据
    const nextOrder = uniqKeepOrder(
      draftOrderKeys.filter((k) => allKeys.includes(k)),
    );
    // ✅ 可见列按“顺序”过滤出来，保证顺序与 nextOrder 一致
    const nextVisible = nextOrder.filter((k) => draftVisibleKeys.includes(k));

    // ✅ 先存顺序，再存可见（两者都会写 localStorage，但顺序优先更直觉）
    onOrderChange?.(nextOrder);
    onChange(nextVisible);

    setOpen(false);
  }, [allKeys, draftOrderKeys, draftVisibleKeys, onChange, onOrderChange]);

  const indeterminate =
    draftVisibleKeys.length > 0 && draftVisibleKeys.length < allKeys.length;
  const allChecked =
    allKeys.length > 0 && draftVisibleKeys.length === allKeys.length;

  return (
    <>
      <Tooltip title="选择要显示的列 / 调整列顺序">
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
          {/* 顶部快捷操作 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
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

          {/* ✅ 列列表：支持显示开关 + 上移/下移 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {draftOrderKeys.map((k, idx) => {
              const title = titleMap.get(k) ?? k;
              const checked = draftVisibleKeys.includes(k);

              return (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => handleToggleVisible(k, e.target.checked)}
                  >
                    <Typography.Text>{title}</Typography.Text>
                  </Checkbox>

                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => move(k, -1)}
                      disabled={idx === 0}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => move(k, 1)}
                      disabled={idx === draftOrderKeys.length - 1}
                    />
                  </Space>
                </div>
              );
            })}
          </div>

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            提示：列显示/顺序偏好由 useColumnPrefs 负责记住（localStorage）。
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
