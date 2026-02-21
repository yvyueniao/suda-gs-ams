// src/features/feedback/hooks/useFeedbackDetail.ts
//
// useFeedbackDetail（Pure）
//
// 职责：
// - 拉取某条反馈的聊天消息列表（/session/content）
// - 发送消息（文本 + 可选附件）（/activity/upload）
// -（可选）管理员关闭反馈（/session/close）
// - 维护本 hook 内部的 loading/error 状态（不做 toast / 不做 confirm）
//
// 约定：
// - ✅ 业务层 hook 不做 UI：不 message、不 Modal.confirm
// - ✅ 具体提示交给页面层（可用 shared/actions/useAsyncAction 包一层）
// - ✅ 关闭后不允许继续发送（isClosed + sendMessage 内部兜底）
// - ✅ 发送成功后默认 reload 一次，确保与后端一致（避免本地拼接导致顺序/时间不一致）

import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeedbackMessageItem, FeedbackState } from "../types";
import {
  closeFeedback,
  fetchFeedbackContent,
  sendFeedbackMessage,
} from "../api";

export type UseFeedbackDetailOptions = {
  /** 会话 ID（必填） */
  sessionId: string;

  /**
   * 初始状态（来自列表行 state）
   * - 用于：关闭后禁止发送、页面按钮显隐
   * - 注意：/session/content 本身不返回会话 state，所以需要列表传进来
   */
  initialState?: FeedbackState;

  /**
   * 是否允许关闭（页面层根据角色控制：管理员 true，普通用户 false）
   * - true：暴露 closeSession()
   * - false：closeSession() 仍存在但会直接返回 false（避免误用）
   */
  canClose?: boolean;
};

export type SendMessageInput = {
  content: string;
  file?: File;
};

export function useFeedbackDetail(options: UseFeedbackDetailOptions) {
  const { sessionId, initialState, canClose = false } = options;

  // ---------------------------
  // state
  // ---------------------------
  const [messages, setMessages] = useState<FeedbackMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);

  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<unknown>(null);

  // 会话状态（仅由外部 initialState + close 成功后更新）
  const [state, setState] = useState<FeedbackState | undefined>(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const isClosed = useMemo(() => state === 2, [state]);

  // ---------------------------
  // fetch / reload
  // ---------------------------
  const reload = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchFeedbackContent({ sessionId });
      setMessages(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // sessionId 变化时自动拉一次
    void reload();
  }, [reload]);

  // ---------------------------
  // send message
  // ---------------------------
  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      if (!sessionId) return false;

      const content = (input.content ?? "").trim();
      if (!content) return false;

      // 已关闭不可发送（业务兜底）
      if (isClosed) return false;

      setSending(true);
      setSendError(null);

      try {
        await sendFeedbackMessage({
          sessionId,
          content,
          file: input.file,
        });

        // 发送成功：为了保证顺序/时间/附件与后端一致，直接 reload
        await reload();
        return true;
      } catch (e) {
        setSendError(e);
        return false;
      } finally {
        setSending(false);
      }
    },
    [sessionId, isClosed, reload],
  );

  // ---------------------------
  // close session（admin）
  // ---------------------------
  const closeSession = useCallback(async () => {
    if (!sessionId) return false;
    if (!canClose) return false;

    // 已关闭就不重复调用
    if (isClosed) return true;

    setClosing(true);
    setCloseError(null);

    try {
      await closeFeedback({ sessionId });
      setState(2); // 本地标记为已解决/已关闭
      // 可选：关闭后也 reload 一次（有些后端会同时写一条“已解决”的系统消息）
      await reload();
      return true;
    } catch (e) {
      setCloseError(e);
      return false;
    } finally {
      setClosing(false);
    }
  }, [sessionId, canClose, isClosed, reload]);

  return {
    // data
    sessionId,
    messages,
    state,
    isClosed,

    // loading/error
    loading,
    error,

    sending,
    sendError,

    closing,
    closeError,

    // actions
    reload,
    sendMessage,
    closeSession,
  };
}
