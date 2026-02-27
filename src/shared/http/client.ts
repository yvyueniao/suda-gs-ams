// src/shared/http/client.ts
import axios, { AxiosError, AxiosInstance } from "axios";
import type { ApiResponse } from "./types";
import { ApiError } from "./error";
import { getToken, clearToken } from "../session/token";
import { clearUser } from "../session/session";

// ✅ 开发期走同源代理 /api（vite proxy / mock 也通常挂在 /api 下）
const BASE_URL = "/api";

/**
 * 可选：用于在 http 层触发“去登录”的动作（避免在这里直接 import router）
 * 你可以在应用入口处注册：setOnUnauthorized(() => navigate("/login"))
 */
let onUnauthorized: ((reason?: string) => void) | null = null;

export function setOnUnauthorized(handler: (reason?: string) => void) {
  onUnauthorized = handler;
}

/**
 * 可选：全局错误上报/埋点（http 层不 toast，不跳路由）
 */
let onHttpError: ((err: ApiError) => void) | null = null;

export function setOnHttpError(handler: (err: ApiError) => void) {
  onHttpError = handler;
}

function isApiEnvelope(x: any): x is ApiResponse<any> {
  return (
    x &&
    typeof x === "object" &&
    typeof x.code === "number" &&
    typeof x.msg === "string" &&
    "data" in x
  );
}

/** ✅ 判断 FormData：用于上传文件 */
function isFormData(val: any): val is FormData {
  return typeof FormData !== "undefined" && val instanceof FormData;
}

/**
 * ✅ 让“HTTP200 + code401”是否登出，变成“可配置”
 * - default: "none"  -> 不登出，仅抛业务错误给上层
 * - "logout"         -> 清 session + 通知跳登录（只用于 /token 等鉴权接口）
 */
type AuthFailPolicy = "none" | "logout";

type RequestMeta = {
  authFail?: AuthFailPolicy;
};

type RequestConfig = Parameters<AxiosInstance["request"]>[0] & {
  meta?: RequestMeta;
};

function doLogout(reason?: string) {
  clearToken();
  clearUser();
  try {
    onUnauthorized?.(reason ?? "未登录或登录已过期");
  } catch {
    // ignore
  }
}

function toApiErrorFromAxios(error: AxiosError): ApiError {
  // 1) 超时
  if (error.code === "ECONNABORTED") {
    return new ApiError("请求超时，请稍后重试", "TIMEOUT");
  }

  // 2) 断网 / 服务未启动 / DNS 等：无 response
  if (!error.response) {
    return new ApiError("网络异常，请检查网络或后端服务", "NETWORK_ERROR");
  }

  const status = error.response.status;
  const data: any = error.response.data;

  const msgFromServer =
    (typeof data?.msg === "string" && data.msg) ||
    (typeof data?.message === "string" && data.message) ||
    undefined;

  // 3) HTTP 401：token 无效/过期（这类一定要登出）
  if (status === 401) {
    doLogout(msgFromServer);
    return new ApiError(
      msgFromServer ?? "未登录或登录已过期",
      "UNAUTHORIZED",
      401,
    );
  }

  // 4) 403：无权限
  if (status === 403) {
    return new ApiError(msgFromServer ?? "没有权限", "FORBIDDEN", 403);
  }

  if (status === 404) {
    return new ApiError(
      msgFromServer ?? "请求资源不存在(404)",
      "BAD_REQUEST",
      404,
    );
  }

  if (status >= 400 && status < 500) {
    return new ApiError(msgFromServer ?? "请求参数错误", "BAD_REQUEST", status);
  }

  if (status >= 500) {
    return new ApiError(msgFromServer ?? "服务器异常", "SERVER_ERROR", status);
  }

  return new ApiError(msgFromServer ?? "未知错误", "UNKNOWN", status);
}

function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 150000,
  });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = token; // ✅ 不加 Bearer
    }

    if (isFormData(config.data)) {
      if (config.headers) {
        delete (config.headers as any)["Content-Type"];
        delete (config.headers as any)["content-type"];
      }
      return config;
    }

    config.headers = config.headers ?? {};
    if (
      !(config.headers as any)["Content-Type"] &&
      !(config.headers as any)["content-type"]
    ) {
      (config.headers as any)["Content-Type"] = "application/json";
    }

    return config;
  });

  instance.interceptors.response.use(
    (res) => {
      const data = res.data;

      if (!isApiEnvelope(data)) return res;

      // ✅ 统一壳：code != 200 视为失败
      if (data.code !== 200) {
        // ✅ 关键：仅在“被标记为 logout 的请求”里，把 code=401 当成未登录
        const cfg = res.config as RequestConfig;
        const authFail: AuthFailPolicy = cfg.meta?.authFail ?? "none";

        if (data.code === 401 && authFail === "logout") {
          doLogout(data.msg || "未登录或登录已过期");
          throw new ApiError(
            data.msg || "未登录或登录已过期",
            "UNAUTHORIZED",
            200,
            401,
          );
        }

        // ✅ 默认：业务错误（不登出）
        const err = new ApiError(
          data.msg || "请求失败",
          "BIZ_ERROR",
          res.status,
          data.code,
        );
        try {
          onHttpError?.(err);
        } catch {
          // ignore
        }
        throw err;
      }

      return res;
    },
    (error: AxiosError) => {
      const err = toApiErrorFromAxios(error);
      try {
        onHttpError?.(err);
      } catch {
        // ignore
      }
      return Promise.reject(err);
    },
  );

  return instance;
}

export const http = createHttpClient();

/**
 * request<T>
 * - 默认按“统一壳 ApiResponse<T>”解析，返回 data
 * - 支持 meta.authFail 控制 “HTTP200+code401 是否登出”
 */
export async function request<T>(config: RequestConfig): Promise<T> {
  const res = await http.request(config);
  const data = res.data;

  if (isApiEnvelope(data)) {
    return data.data as T;
  }

  return data as T;
}
