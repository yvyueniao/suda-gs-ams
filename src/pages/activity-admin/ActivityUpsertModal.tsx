// src/pages/activity-admin/ActivityUpsertModal.tsx

/**
 * ActivityUpsertModal
 *
 * 职责：
 * - 活动/讲座“新建 / 修改”复用弹窗（纯 UI + 表单校验 + 异步按钮）
 *
 * 约定：
 * - 真实提交逻辑由父组件传入（create/update）
 * - loading / toast / ApiError 统一走 shared/actions/useAsyncAction
 * - ✅ “修改”复用本弹窗，但按后端接口约束：
 *   - /activity/updateActivityInfo 仅支持修改：
 *     signStartTime/signEndTime/fullNum/score/activityStime/activityEtime
 *   - name/description/location/type 在 edit 模式下只读展示（不可编辑）
 */

import { useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Radio,
  Space,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { useAsyncAction } from "../../shared/actions";

import type {
  ActivityType,
  CreateActivityPayload,
  ManageableActivityItem,
  UpdateActivityPayload,
} from "../../features/activity-admin/types";

const DT_FORMAT = "YYYY-MM-DD HH:mm:ss";

type Mode = "create" | "edit";

export type ActivityUpsertModalProps = {
  open: boolean;
  mode: Mode;

  /** edit 模式下用于回填 */
  editing?: ManageableActivityItem | null;

  onCancel: () => void;

  /** create 模式提交 */
  onSubmitCreate: (payload: CreateActivityPayload) => Promise<unknown>;

  /** edit 模式提交 */
  onSubmitUpdate: (payload: UpdateActivityPayload) => Promise<unknown>;

  /** 成功后回调（通常用于 reload） */
  onSuccess?: () => void;
};

type FormValues = {
  // create/edit 共同展示（edit 下部分只读）
  name: string;
  description: string;
  type: ActivityType;
  location: string;

  // 可编辑字段（create/edit 都可改，但 edit 只提交允许修改的子集）
  signStartTime: Dayjs;
  signEndTime: Dayjs;
  fullNum: number;
  score: number;
  activityStime: Dayjs;
  activityEtime: Dayjs;
};

function toDayjs(v?: string | null) {
  if (!v) return undefined;
  const d = dayjs(v, DT_FORMAT);
  return d.isValid() ? d : undefined;
}

function formatDT(v: Dayjs) {
  return v.format(DT_FORMAT);
}

export default function ActivityUpsertModal(props: ActivityUpsertModalProps) {
  const {
    open,
    mode,
    editing,
    onCancel,
    onSubmitCreate,
    onSubmitUpdate,
    onSuccess,
  } = props;

  const [form] = Form.useForm<FormValues>();

  const isEdit = mode === "edit";

  const action = useAsyncAction({
    successMessage: isEdit ? "修改成功" : "创建成功",
  });

  const initialValues = useMemo((): Partial<FormValues> => {
    if (!editing) return {};

    return {
      name: editing.name,
      description: editing.description,
      type: editing.type,
      location: editing.location,

      signStartTime: toDayjs(editing.signStartTime),
      signEndTime: toDayjs(editing.signEndTime),
      fullNum: editing.fullNum,
      score: editing.score,
      activityStime: toDayjs(editing.activityStime),
      activityEtime: toDayjs(editing.activityEtime),
    };
  }, [editing]);

  // 打开/切换模式时回填；关闭时重置
  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (isEdit) {
      form.setFieldsValue(initialValues as FormValues);
    } else {
      // create：给一些合理默认值
      form.setFieldsValue({
        type: 0,
      } as Partial<FormValues>);
    }
  }, [open, isEdit, form, initialValues]);

  const validateTimeOrder = (values: FormValues) => {
    const s1 = values.signStartTime?.valueOf?.() ?? 0;
    const s2 = values.signEndTime?.valueOf?.() ?? 0;
    const a1 = values.activityStime?.valueOf?.() ?? 0;
    const a2 = values.activityEtime?.valueOf?.() ?? 0;

    // signStartTime < signEndTime < activityStime < activityEtime
    if (!(s1 && s2 && a1 && a2)) return;

    const ok = s1 < s2 && s2 < a1 && a1 < a2;
    if (ok) return;

    // 把错误落到 4 个字段上（用户更容易改）
    form.setFields([
      {
        name: "signStartTime",
        errors: ["时间顺序需满足：报名开始 < 报名截止 < 活动开始 < 活动结束"],
      },
      {
        name: "signEndTime",
        errors: ["时间顺序需满足：报名开始 < 报名截止 < 活动开始 < 活动结束"],
      },
      {
        name: "activityStime",
        errors: ["时间顺序需满足：报名开始 < 报名截止 < 活动开始 < 活动结束"],
      },
      {
        name: "activityEtime",
        errors: ["时间顺序需满足：报名开始 < 报名截止 < 活动开始 < 活动结束"],
      },
    ]);
    throw new Error("时间顺序不合法");
  };

  const handleOk = async () => {
    const values = await form.validateFields();

    // 额外的时间顺序校验（后端也会校验，但前端先拦住体验更好）
    validateTimeOrder(values);

    await action.run(async () => {
      if (isEdit) {
        if (!editing) throw new Error("缺少 editing 数据，无法修改");

        // ⚠️ update 接口只允许修改部分字段
        const payload: UpdateActivityPayload = {
          id: editing.id,
          signStartTime: formatDT(values.signStartTime),
          signEndTime: formatDT(values.signEndTime),
          fullNum: values.fullNum,
          score: values.score,
          activityStime: formatDT(values.activityStime),
          activityEtime: formatDT(values.activityEtime),
        };

        await onSubmitUpdate(payload);
      } else {
        const payload: CreateActivityPayload = {
          name: values.name,
          description: values.description,
          type: values.type,
          location: values.location,

          signStartTime: formatDT(values.signStartTime),
          signEndTime: formatDT(values.signEndTime),
          fullNum: values.fullNum,
          score: values.score,
          activityStime: formatDT(values.activityStime),
          activityEtime: formatDT(values.activityEtime),
        };

        await onSubmitCreate(payload);
      }
    });

    // run 没抛错 => 成功
    if (!action.loading) {
      onCancel();
      onSuccess?.();
    }
  };

  return (
    <Modal
      title={isEdit ? "修改活动/讲座" : "新建活动/讲座"}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={action.loading}
      destroyOnClose
      width={860}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false}>
        <Space size={16} style={{ display: "flex" }} align="start">
          <Form.Item
            name="name"
            label="名称"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: "请输入名称" },
              { max: 60, message: "名称不能超过 60 个字符" },
            ]}
          >
            <Input
              placeholder="请输入活动/讲座名称"
              allowClear
              disabled={isEdit}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            style={{ width: 220 }}
            rules={[{ required: true, message: "请选择类型" }]}
          >
            <Radio.Group disabled={isEdit}>
              <Radio value={0}>活动</Radio>
              <Radio value={1}>讲座</Radio>
            </Radio.Group>
          </Form.Item>
        </Space>

        <Form.Item
          name="description"
          label="描述"
          rules={[
            { required: true, message: "请输入描述" },
            { max: 500, message: "描述不能超过 500 个字符" },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="请输入活动/讲座描述"
            showCount
            maxLength={500}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="地点"
          rules={[
            { required: true, message: "请输入地点" },
            { max: 60, message: "地点不能超过 60 个字符" },
          ]}
        >
          <Input placeholder="请输入地点" allowClear disabled={isEdit} />
        </Form.Item>

        <Space size={16} style={{ display: "flex" }} align="start">
          <Form.Item
            name="signStartTime"
            label="报名开始时间"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请选择报名开始时间" }]}
          >
            <DatePicker showTime format={DT_FORMAT} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="signEndTime"
            label="报名截止时间"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请选择报名截止时间" }]}
          >
            <DatePicker showTime format={DT_FORMAT} style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Space size={16} style={{ display: "flex" }} align="start">
          <Form.Item
            name="activityStime"
            label="活动开始时间"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请选择活动开始时间" }]}
          >
            <DatePicker showTime format={DT_FORMAT} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="activityEtime"
            label="活动结束时间"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请选择活动结束时间" }]}
          >
            <DatePicker showTime format={DT_FORMAT} style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Space size={16} style={{ display: "flex" }} align="start">
          <Form.Item
            name="fullNum"
            label="人数上限"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请输入人数上限" }]}
          >
            <InputNumber min={1} max={999999} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="score"
            label="分数"
            style={{ flex: 1 }}
            rules={[{ required: true, message: "请输入分数" }]}
          >
            <InputNumber min={0} max={999999} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
