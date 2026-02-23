// src/pages/rbac/user/SpecialScoreModal.tsx
/**
 * SpecialScoreModal
 *
 * ✅ 页面层 UI 组件（不直接请求接口）
 * - Modal + 表单（✅姓名/✅学号：双下拉共用同一套候选；双向回填一致）
 * - 事件全部由父层注入（useUserSpecialScore 提供）
 * - 尽量不影响原有用户管理页面逻辑：作为一个“可插拔弹窗”
 */

import { useMemo } from "react";
import {
  Modal,
  Form,
  AutoComplete,
  Input,
  Select,
  InputNumber,
  Space,
  Typography,
} from "antd";

import type {
  SpecialScoreType,
  UserNameOption,
} from "../../../features/rbac/user/types";

const { Text } = Typography;

export type SpecialScoreModalProps = {
  open: boolean;
  onClose: () => void;

  submitting?: boolean;
  searching?: boolean;

  /** 表单值（由 hook 维护） */
  value: {
    name: string;
    username: string;
    type: SpecialScoreType;
    score: number | undefined;
  };

  /** ✅ 姓名输入变化（触发模糊搜索：共用候选） */
  onNameInput: (name: string) => void | Promise<unknown>;

  /** ✅ 学号输入变化（触发模糊搜索：共用候选） */
  onUsernameInput: (username: string) => void | Promise<unknown>;

  /** ✅ 选择某个候选人（同时回填姓名 + 学号，保证一致） */
  onPickUser: (opt: UserNameOption) => void;

  /** ✅ 清空已选用户（两列一起清，防止残留不一致） */
  clearPickedUser?: () => void;

  /** 候选列表（由 hook 维护） */
  options: UserNameOption[];

  /** 选择加分类型 */
  onTypeChange: (type: SpecialScoreType) => void;

  /** 输入分数 */
  onScoreChange: (score: number | null) => void;

  /** 点击确认提交 */
  onSubmit: () => void | Promise<unknown>;
};

/**
 * 你第三列“加分类型”的选项
 * - 我这里先给出一个默认枚举（0/1），你之后可以按真实后端 type 口径改文案即可
 */
const TYPE_OPTIONS: Array<{ label: string; value: SpecialScoreType }> = [
  { label: "社会服务加分", value: 0 },
  { label: "讲座次数加分", value: 1 },
];

export default function SpecialScoreModal(props: SpecialScoreModalProps) {
  const {
    open,
    onClose,
    submitting,
    searching,
    value,
    options,

    onNameInput,
    onUsernameInput,
    onPickUser,
    clearPickedUser,

    onTypeChange,
    onScoreChange,
    onSubmit,
  } = props;

  const nameOptions = useMemo(() => {
    // AutoComplete 需要：{ value, label }
    return (options ?? []).map((x) => ({
      value: x.name, // ✅ 选中后输入框显示“姓名”
      label: (
        <Space size={8}>
          <Text>{x.name}</Text>
          <Text type="secondary">{x.username}</Text>
        </Space>
      ),
      _raw: x,
    }));
  }, [options]);

  const usernameOptions = useMemo(() => {
    return (options ?? []).map((x) => ({
      value: x.username, // ✅ 选中后输入框显示“学号”
      label: (
        <Space size={8}>
          <Text>{x.username}</Text>
          <Text type="secondary">{x.name}</Text>
        </Space>
      ),
      _raw: x,
    }));
  }, [options]);

  const canSubmit =
    !!value.username &&
    !!value.name &&
    typeof value.score === "number" &&
    !Number.isNaN(value.score) &&
    value.score >= 0;

  return (
    <Modal
      title="录入加分"
      open={open}
      onCancel={onClose}
      okText="确认录入"
      cancelText="取消"
      confirmLoading={!!submitting}
      okButtonProps={{ disabled: !canSubmit }}
      maskClosable={false}
      destroyOnClose
      width={760}
      onOk={() => void onSubmit()}
    >
      <Form layout="vertical">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {/* 1) 姓名：双下拉之一（共用候选） */}
          <Form.Item
            label="姓名"
            required
            tooltip="可输入姓名模糊搜索；也可直接从下拉选择。修改姓名会自动清空学号以避免不一致。"
          >
            <AutoComplete
              value={value.name}
              options={nameOptions as any}
              onSearch={(text) => void onNameInput(text)}
              onChange={(text) => {
                // allowClear：清空时两列一起清更安全
                if (!text) {
                  clearPickedUser?.();
                  void onNameInput("");
                  return;
                }
                void onNameInput(text);
              }}
              onSelect={(_val, option: any) => {
                const raw = option?._raw as UserNameOption | undefined;
                if (raw) onPickUser(raw);
              }}
              placeholder="输入姓名 / 选择下拉"
              allowClear
              notFoundContent={searching ? "搜索中..." : "无匹配用户"}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* 2) 学号：双下拉之二（共用候选） */}
          <Form.Item
            label="学号"
            required
            tooltip="可输入学号模糊搜索；也可直接从下拉选择。修改学号会自动清空姓名以避免不一致。"
          >
            <AutoComplete
              value={value.username}
              options={usernameOptions as any}
              onSearch={(text) => void onUsernameInput(text)}
              onChange={(text) => {
                if (!text) {
                  clearPickedUser?.();
                  void onUsernameInput("");
                  return;
                }
                void onUsernameInput(text);
              }}
              onSelect={(_val, option: any) => {
                const raw = option?._raw as UserNameOption | undefined;
                if (raw) onPickUser(raw);
              }}
              placeholder="输入学号 / 选择下拉"
              allowClear
              notFoundContent={searching ? "搜索中..." : "无匹配用户"}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* 3) 加分类型 */}
          <Form.Item label="加分类型" required>
            <Select
              value={value.type}
              options={TYPE_OPTIONS as any}
              onChange={(v) => onTypeChange(v as SpecialScoreType)}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* 4) 分数 */}
          <Form.Item label="加分分数" required>
            <InputNumber
              value={value.score}
              min={0}
              precision={0}
              placeholder="请输入分数"
              onChange={(v) => onScoreChange(v)}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>

        <Text type="secondary">
          提示：姓名/学号任意一列都可以搜索并下拉选择；一旦手动修改其中一列，另一列会被清空以防止信息不一致。
        </Text>
      </Form>
    </Modal>
  );
}
