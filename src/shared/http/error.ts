// src/shared/http/error.ts

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "SERVER_ERROR"
  | "BIZ_ERROR"
  | "UNKNOWN";

/**
 * ApiError
 *
 * 设计目标：
 * 1) 统一 http / 业务错误结构
 * 2) 支持 HTTP status
 * 3) 支持后端业务 bizCode
 * 4) 兼容 instanceof 判断
 * 5) 可安全扩展（用于监控 / Sentry）
 */
export class ApiError extends Error {
  /** 错误分类（前端侧枚举） */
  public code: ApiErrorCode;

  /** HTTP 状态码（如 401 / 404 / 500） */
  public status?: number;

  /** 后端业务 code（如 4001 / 5003 等） */
  public bizCode?: number;

  constructor(
    message: string,
    code: ApiErrorCode,
    status?: number,
    bizCode?: number,
  ) {
    super(message);

    this.name = "ApiError";
    this.code = code;
    this.status = status;

    // ✅ 仅在存在时赋值（更安全）
    if (typeof bizCode !== "undefined") {
      this.bizCode = bizCode;
    }

    // ✅ 保证原型链正确（兼容某些环境）
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
