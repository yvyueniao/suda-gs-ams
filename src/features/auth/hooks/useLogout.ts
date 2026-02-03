import { Modal, message } from "antd";
import { useNavigate } from "react-router-dom";

import { clearToken } from "../../../shared/session/token";
import { clearUser } from "../../../shared/session/session";

/**
 * useLogout
 *
 * 职责：
 * - 统一封装「退出登录」流程
 * - 可选择是否需要确认弹窗
 * - 清理 token + user
 * - 跳转到 /login
 *
 * Layout / 个人中心 / 设置页 等地方都可以复用
 */
export function useLogout() {
  const navigate = useNavigate();

  /**
   * 执行退出登录
   *
   * @param confirm 是否需要二次确认（默认 true）
   */
  function logout(confirm: boolean = true) {
    const doLogout = () => {
      clearToken();
      clearUser();
      message.success("已退出登录");
      navigate("/login", { replace: true });
    };

    if (!confirm) {
      doLogout();
      return;
    }

    Modal.confirm({
      title: "确认退出登录？",
      content: "退出后需要重新登录才能使用系统功能。",
      okText: "退出",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: doLogout,
    });
  }

  return { logout };
}
