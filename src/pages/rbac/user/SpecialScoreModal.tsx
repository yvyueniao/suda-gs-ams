// src/pages/rbac/user/SpecialScoreModal.tsx
/**
 * SpecialScoreModal
 *
 * ✅ 页面层 UI 组件（不直接请求接口）
 * - Modal + 表单（姓名模糊匹配 / 学号回填 / 类型选择 / 分数输入）
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

  /** 姓名输入变化（触发模糊搜索） */
  onNameInput: (name: string) => void | Promise<unknown>;

  /** 选择某个候选人（回填学号） */
  onPickUser: (opt: UserNameOption) => void;

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
 * - 我这里先给出一个默认枚举（0/1/2），你之后可以按真实后端 type 口径改文案即可
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
    onPickUser,
    onTypeChange,
    onScoreChange,
    onSubmit,
  } = props;

  const acOptions = useMemo(() => {
    // AutoComplete 需要：{ value, label }
    return (options ?? []).map((x) => ({
      value: x.name, // ✅ 选中后输入框显示“姓名”
      label: (
        <Space size={8}>
          <Text>{x.name}</Text>
          <Text type="secondary">{x.username}</Text>
        </Space>
      ),
      // 把完整对象挂上去，onSelect 时能取到 username
      _raw: x,
    }));
  }, [options]);

  const canSubmit =
    !!value.username &&
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
      width={720}
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
          {/* 1) 姓名：模糊匹配 */}
          <Form.Item
            label="姓名"
            required
            tooltip="输入姓名后会模糊匹配，必须从下拉列表中选择以回填学号"
          >
            <AutoComplete
              value={value.name}
              options={acOptions as any}
              onSearch={(text) => void onNameInput(text)}
              onChange={(text) => void onNameInput(text)}
              onSelect={(_val, option: any) => {
                const raw = option?._raw as UserNameOption | undefined;
                if (raw) onPickUser(raw);
              }}
              placeholder="输入姓名进行模糊匹配"
              allowClear
              notFoundContent={searching ? "搜索中..." : "无匹配用户"}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* 2) 学号：自动回填、只读 */}
          <Form.Item label="学号" required tooltip="选择姓名后自动回填">
            <Input value={value.username} placeholder="自动回填" readOnly />
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
          提示：必须从姓名匹配列表中选择用户，才能自动回填学号并提交。
        </Text>
      </Form>
    </Modal>
  );
}
