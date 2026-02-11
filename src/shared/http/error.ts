//src\shared\http\error.ts
export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "SERVER_ERROR"
  | "BIZ_ERROR"
  | "UNKNOWN";

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  bizCode?: number;

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
    this.bizCode = bizCode;
  }
}
