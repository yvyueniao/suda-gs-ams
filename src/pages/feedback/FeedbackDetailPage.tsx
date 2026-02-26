// src/pages/feedback/FeedbackDetailPage.tsx
//
// FeedbackDetailPage（UI 渲染层）
//
// 职责：
// - 隐藏路由详情页：/feedback/detail/:sessionId（或你在 App.tsx 配的同义路径）
// - 标题显示反馈 title（title 从列表页 navigate state 传入；本页不额外 request）
// - 聊天界面：我的消息在右侧，其它人在左侧；显示：发送人(name)/时间/content/附件
// - 底部发送框：输入文字 + 可选上传 pdf（<=20MB）+ 发送
// - 管理员（role===0）可见“结束反馈”按钮；普通用户不可见
//
// 约定：
// - ✅ 页面层可以做交互：confirm / toast（通过 shared/ui）
// - ✅ 业务请求与状态：useFeedbackDetail（features/feedback/hooks）
// - ✅ 附件打开：新标签页预览（fileUrl 直接可访问，无 token）

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  Button,
  Card,
  Divider,
  Empty,
  Input,
  Space,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";

import { getUser } from "../../shared/session/session";
import { confirmAsync, notify } from "../../shared/ui";
import { SafeLink } from "../../shared/components/SafeLink";

import type { FeedbackState } from "../../features/feedback/types";
import { useFeedbackDetail } from "../../features/feedback/hooks/useFeedbackDetail";

const { Title, Text } = Typography;

type LocationState = {
  title?: string;
  state?: FeedbackState; // 列表行的 state（0/1/2）
};

function isPdf(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || file.type === "application/pdf";
}

function fileTooLarge(file: File, maxMb = 20) {
  return file.size > maxMb * 1024 * 1024;
}

function fileNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "";
    return decodeURIComponent(last) || "附件";
  } catch {
    const last = url.split("/").pop() || "";
    return decodeURIComponent(last) || "附件";
  }
}

/** Notify 的函数式用法（你们当前 shared/ui/notify.ts 约定） */
function nSuccess(msg: string) {
  notify({ kind: "success", msg });
}
function nError(msg: string) {
  notify({ kind: "error", msg });
}
function nInfo(msg: string) {
  notify({ kind: "info", msg });
}

export default function FeedbackDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId || "";

  const location = useLocation();
  const stateFromList = (location.state || {}) as LocationState;

  const me = getUser();
  const myUsername = me?.username ?? "";
  const role = Number(me?.role);
  const canClose = !!me && role !== 4; // ✅ 只要不是普通学生，都显示结束按钮

  const pageTitle = useMemo(() => {
    return stateFromList.title ? stateFromList.title : "反馈详情";
  }, [stateFromList.title]);

  const {
    messages,
    loading,
    error,
    isClosed,
    sending,
    closing,
    reload,
    sendMessage,
    closeSession,
  } = useFeedbackDetail({
    sessionId,
    initialState: stateFromList.state,
    canClose,
  });

  // 输入区
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);

  // 自动滚到底部
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handlePickFile: UploadProps["beforeUpload"] = (f) => {
    const fileObj = f as File;

    if (!isPdf(fileObj)) {
      nError("只支持上传 PDF 文件");
      return Upload.LIST_IGNORE;
    }
    if (fileTooLarge(fileObj, 20)) {
      nError("文件过大，最大支持 20MB");
      return Upload.LIST_IGNORE;
    }

    setFile(fileObj);
    // 阻止 antd 自动上传
    return false;
  };

  const handleRemoveFile = () => {
    setFile(undefined);
  };

  const handleSend = async () => {
    const text = content.trim();
    if (!text) {
      nInfo("请输入要发送的内容");
      return;
    }
    if (isClosed) {
      nInfo("该反馈已结束，无法继续发送消息");
      return;
    }

    const ok = await sendMessage({ content: text, file });
    if (ok) {
      setContent("");
      setFile(undefined);
      nSuccess("发送成功");
    } else {
      nError("发送失败");
    }
  };

  const handleClose = async () => {
    if (!canClose) return;

    const confirmed = await confirmAsync({
      title: "结束反馈",
      content: "确认结束该反馈吗？结束后将无法继续对话。",
      okText: "确认结束",
      cancelText: "取消",
    });
    if (!confirmed) return;

    const ok = await closeSession();
    if (ok) {
      nSuccess("已结束反馈");
    } else {
      nError("结束失败");
    }
  };

  const headerExtra = (
    <Space>
      <Button onClick={() => navigate(-1)}>返回</Button>

      <Button onClick={reload} disabled={loading}>
        刷新
      </Button>

      {canClose ? (
        <Button
          danger
          onClick={handleClose}
          loading={closing}
          disabled={isClosed}
        >
          结束反馈
        </Button>
      ) : null}
    </Space>
  );

  return (
    <div className="feedback-page">
      <div
        style={{
          height: "calc(113vh - 56px - 48px - 24px - 120px)",
          overflow: "auto",
        }}
      >
        <div className="feedback-container">
          <Card
            title={
              <div className="feedback-header">
                <Title level={4} className="feedback-title">
                  {pageTitle}
                </Title>

                <Text className="feedback-subtitle">
                  会话 ID：{sessionId || "-"} {isClosed ? "（已结束）" : ""}
                </Text>

                {isClosed ? (
                  <div className="feedback-closed-hint">
                    该反馈已结束，无法继续发送消息
                  </div>
                ) : null}
              </div>
            }
            extra={headerExtra}
          >
            {/* 内容区 */}
            <div className="chat-panel">
              {loading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <Spin />
                </div>
              ) : error ? (
                <div style={{ padding: 24 }}>
                  <Text type="danger">加载失败</Text>
                  <Divider />
                  <Button onClick={reload}>重试</Button>
                </div>
              ) : messages.length === 0 ? (
                <Empty description="暂无对话内容" />
              ) : (
                <div className="chat-list">
                  {messages.map((m, idx) => {
                    const isMe = myUsername && m.username === myUsername;

                    return (
                      <div
                        key={`${m.sessionId}-${m.time}-${idx}`}
                        className={`chat-row ${isMe ? "is-me" : "is-other"}`}
                      >
                        <div
                          className={`chat-bubble ${isMe ? "is-me" : "is-other"}`}
                        >
                          <div className="chat-bubble__meta">
                            <Text className="chat-bubble__name">
                              {m.name || m.username || (isMe ? "我" : "对方")}
                            </Text>
                            <Text className="chat-bubble__time">{m.time}</Text>
                          </div>

                          <div className="chat-bubble__content">
                            {m.content || "-"}
                          </div>

                          {m.fileUrl ? (
                            <div className="chat-attach">
                              <span className="chat-attach__icon">PDF</span>
                              <span className="chat-attach__name">
                                {fileNameFromUrl(m.fileUrl)}
                              </span>

                              {/* ✅ 统一外链安全（noopener/noreferrer + 可扩展白名单/协议校验） */}
                              <SafeLink
                                className="chat-attach__link"
                                href={m.fileUrl}
                                target="_blank"
                              >
                                打开
                              </SafeLink>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* 发送区 */}
            <div className={`chat-composer ${isClosed ? "chat-disabled" : ""}`}>
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="small"
              >
                <Input.TextArea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    isClosed ? "该反馈已结束，无法继续发送" : "输入消息..."
                  }
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  disabled={isClosed}
                />

                <div className="chat-composer__row">
                  <div className="chat-composer__left">
                    <Upload
                      beforeUpload={handlePickFile}
                      onRemove={handleRemoveFile}
                      maxCount={1}
                      showUploadList
                      accept=".pdf,application/pdf"
                      fileList={
                        file
                          ? ([
                              {
                                uid: "picked",
                                name: file.name,
                                status: "done",
                              },
                            ] as any)
                          : []
                      }
                    >
                      <Button disabled={isClosed}>上传附件（PDF，可选）</Button>
                    </Upload>

                    {file ? (
                      <Text type="secondary" className="chat-filehint">
                        已选择：{file.name}
                      </Text>
                    ) : (
                      <Text type="secondary" className="chat-filehint">
                        附件可选，最多 20MB
                      </Text>
                    )}
                  </div>

                  <Button
                    type="primary"
                    onClick={handleSend}
                    loading={sending}
                    disabled={isClosed}
                  >
                    发送
                  </Button>
                </div>
              </Space>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
