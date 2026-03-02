// src/app/theme/ThemeSettingsModal.tsx
/**
 * ThemeSettingsModal
 *
 * ✅ 主题设置弹窗（应用级 UI）
 * - 只做 UI：展示控件 + 调用 useThemePrefs 更新偏好
 * - 偏好持久化/主题注入由 ThemeProvider 负责
 *
 * 支持：
 * - 模式：浅色 / 深色（❌已移除护眼）
 * - 主色：预设色板
 * - 布局密度：紧凑 / 默认 / 宽松
 * - 圆角：8~16（全局）
 * - 字号：12~16
 * - 恢复默认
 */

import { useMemo } from "react";
import {
  Modal,
  Segmented,
  Slider,
  Space,
  Typography,
  Divider,
  Button,
  Tooltip,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { useThemePrefs } from "./ThemeProvider";
import { DEFAULT_THEME_PREFS } from "../../shared/theme/prefs";

const { Text } = Typography;

export type ThemeSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ThemeSettingsModal(props: ThemeSettingsModalProps) {
  const { prefs, setPrefs, reset } = useThemePrefs();

  // ✅ 预设主色（不要太多，避免用户选择困难）
  const primaryPresets = useMemo(
    () => [
      { label: "清爽蓝", value: "#5B8FF9" },
      { label: "AntD 蓝", value: "#1677ff" },
      { label: "清新绿", value: "#22c55e" },
      { label: "活力橙", value: "#f97316" },
      { label: "高级紫", value: "#a855f7" },
      { label: "玫红", value: "#ec4899" },
    ],
    [],
  );

  const set = (patch: Partial<typeof prefs>) => {
    setPrefs({ ...prefs, ...patch });
  };

  const isDefault =
    prefs.mode === DEFAULT_THEME_PREFS.mode &&
    prefs.primaryColor === DEFAULT_THEME_PREFS.primaryColor &&
    prefs.density === DEFAULT_THEME_PREFS.density &&
    prefs.radius === DEFAULT_THEME_PREFS.radius &&
    prefs.fontSize === DEFAULT_THEME_PREFS.fontSize;

  return (
    <Modal
      title="外观设置"
      open={props.open}
      onCancel={props.onClose}
      onOk={props.onClose}
      okText="完成"
      cancelText="关闭"
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* 模式 */}
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text>模式</Text>
          <Segmented
            value={prefs.mode}
            options={[
              { label: "浅色", value: "light" },
              { label: "深色", value: "dark" },
            ]}
            onChange={(v) => set({ mode: v as any })}
          />
        </Space>

        {/* 布局密度 */}
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text>布局密度</Text>
          <Segmented
            value={prefs.density}
            options={[
              { label: "紧凑", value: "compact" },
              { label: "默认", value: "default" },
              { label: "宽松", value: "comfortable" },
            ]}
            onChange={(v) => set({ density: v as any })}
          />
        </Space>

        <Divider style={{ margin: "8px 0" }} />

        {/* 主色 */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text>交互主色</Text>
            <Text type="secondary">{prefs.primaryColor}</Text>
          </Space>

          <Space wrap style={{ marginTop: 10 }}>
            {primaryPresets.map((c) => {
              const active = prefs.primaryColor === c.value;
              return (
                <Tooltip key={c.value} title={c.label}>
                  <button
                    type="button"
                    onClick={() => set({ primaryColor: c.value })}
                    aria-label={`primary-${c.value}`}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      cursor: "pointer",
                      background: c.value,
                      border: active
                        ? "2px solid rgba(0,0,0,0.35)"
                        : "1px solid rgba(0,0,0,0.18)",
                      outline: "none",
                    }}
                  />
                </Tooltip>
              );
            })}
          </Space>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* 圆角 */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text>边框圆角</Text>
            <Text type="secondary">{prefs.radius}px</Text>
          </Space>
          <Slider
            min={8}
            max={16}
            step={1}
            value={prefs.radius}
            onChange={(v) => set({ radius: v as number })}
          />
        </div>

        {/* 字号 */}
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text>字号</Text>
            <Text type="secondary">{prefs.fontSize}px</Text>
          </Space>
          <Slider
            min={12}
            max={16}
            step={1}
            value={prefs.fontSize}
            onChange={(v) => set({ fontSize: v as number })}
          />
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* 恢复默认 */}
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Text type="secondary">提示：设置会自动保存，刷新后仍生效</Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => reset()}
            disabled={isDefault}
          >
            恢复默认
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}

export default ThemeSettingsModal;
