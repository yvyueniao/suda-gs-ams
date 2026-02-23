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
 * 例如：setOnHttpError((e)=>Sentry.captureException(e))
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

  // 3) 401：token 无效/过期（统一清会话 + 通知跳登录）
  if (status === 401) {
    clearToken();
    clearUser();

    try {
      onUnauthorized?.(msgFromServer ?? "未登录或登录已过期");
    } catch {
      // ignore
    }

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

  /**
   * ✅ 关键：接口 404 不在 http 层“跳前端 404 页面”
   * - 路由 404：由 <Route path="*" /> 兜底
   * - 接口 404：按普通请求错误处理（交给业务层显示“请重试”等）
   *
   * 同时：不引入新 ApiErrorCode（避免 "NOT_FOUND" 类型报错）
   */
  if (status === 404) {
    return new ApiError(
      msgFromServer ?? "请求资源不存在(404)",
      "BAD_REQUEST",
      404,
    );
  }

  // 5) 4xx：参数/请求错误
  if (status >= 400 && status < 500) {
    return new ApiError(msgFromServer ?? "请求参数错误", "BAD_REQUEST", status);
  }

  // 6) 5xx：服务器错误
  if (status >= 500) {
    return new ApiError(msgFromServer ?? "服务器异常", "SERVER_ERROR", status);
  }

  // 兜底
  return new ApiError(msgFromServer ?? "未知错误", "UNKNOWN", status);
}

function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 150000,
    // ✅ 不要在这里写死 Content-Type: application/json
    //    否则 FormData 上传会被强行变成 JSON，后端解析失败
  });

  // ✅ 请求拦截：自动加 token（后端要求：Authorization: token值）
  // ✅ 同时：识别 FormData，避免覆盖 Content-Type，让 axios 自动带 boundary
  instance.interceptors.request.use((config) => {
    // 1) token 注入
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = token; // ✅ 不加 Bearer
    }

    // 2) FormData：删除可能存在的 JSON Content-Type，交给 axios 自动生成 multipart/form-data; boundary=...
    if (isFormData(config.data)) {
      if (config.headers) {
        delete (config.headers as any)["Content-Type"];
        delete (config.headers as any)["content-type"];
      }
      return config;
    }

    // 3) 非 FormData：默认按 JSON（按需设置，不要全局写死）
    config.headers = config.headers ?? {};
    if (
      !(config.headers as any)["Content-Type"] &&
      !(config.headers as any)["content-type"]
    ) {
      (config.headers as any)["Content-Type"] = "application/json";
    }

    return config;
  });

  /**
   * ✅ 响应拦截：
   * - 只做两件事：
   *   1) 统一壳 code!=200 -> 抛 ApiError(BIZ_ERROR)
   *   2) axios error -> 转成 ApiError 并抛出
   *
   * ❌ 不 toast
   * ❌ 不 navigate（除了 401 触发 onUnauthorized）
   * ❌ 不 retry
   */
  instance.interceptors.response.use(
    (res) => {
      const data = res.data;

      // 非统一壳：直接放过（数组/对象/文件流等）
      if (!isApiEnvelope(data)) return res;

      // 统一壳：code != 200 视为业务失败
      if (data.code !== 200) {
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
 * - 如果接口不是统一壳（res.data 不是 {code,msg,data}），则直接返回 res.data
 */
export async function request<T>(
  config: Parameters<AxiosInstance["request"]>[0],
): Promise<T> {
  const res = await http.request(config);

  const data = res.data;

  // ✅ 统一壳：返回 data
  if (isApiEnvelope(data)) {
    return data.data as T;
  }

  // ✅ 非统一壳：直接返回 res.data
  return data as T;
}
