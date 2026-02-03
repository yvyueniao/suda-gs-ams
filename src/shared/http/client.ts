import axios, { AxiosError, AxiosInstance } from "axios";
import type { ApiResponse } from "./types";
import { ApiError } from "./error";
import { getToken, clearToken } from "../session/token";
import { clearUser } from "../session/session";
// ✅ 开发期走同源代理 /api
const BASE_URL = "/api";

/**
 * 可选：用于在 http 层触发“去登录”的动作（避免在这里直接 import router）
 * 你可以在应用入口处注册：setOnUnauthorized(() => navigate("/login"))
 */
let onUnauthorized: ((reason?: string) => void) | null = null;

export function setOnUnauthorized(handler: (reason?: string) => void) {
  onUnauthorized = handler;
}

function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // ✅ 请求拦截：自动加 token（后端要求：Authorization: token值）
  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = token; // ✅ 不加 Bearer，按你后端文档
    }
    return config;
  });

  // ✅ 响应拦截：统一处理“统一壳”业务 code
  instance.interceptors.response.use(
    (res) => {
      const payload = res.data as ApiResponse<unknown>;

      // 不是统一壳：直接放过（例如：后端直接返回数组/对象、或文件流等）
      if (
        !payload ||
        typeof payload !== "object" ||
        typeof (payload as any).code !== "number" ||
        typeof (payload as any).msg !== "string"
      ) {
        return res;
      }

      // 统一壳：code != 200 视为业务失败
      if (payload.code !== 200) {
        throw new ApiError(
          payload.msg || "请求失败",
          "BIZ_ERROR",
          res.status,
          payload.code,
        );
      }

      return res;
    },
    (error: AxiosError) => {
      // 超时
      if (error.code === "ECONNABORTED") {
        return Promise.reject(new ApiError("请求超时，请稍后重试", "TIMEOUT"));
      }

      // 断网 / 后端未启动 / DNS 等（无 response）
      if (!error.response) {
        return Promise.reject(
          new ApiError("网络异常，请检查网络或后端服务", "NETWORK_ERROR"),
        );
      }

      const status = error.response.status;
      const data: any = error.response.data;
      const msgFromServer = data?.msg || data?.message;

      // 401：token 无效/过期
      if (status === 401) {
        clearToken();
        clearUser();

        // 可选：触发全局“去登录”
        try {
          onUnauthorized?.(msgFromServer ?? "未登录或登录已过期");
        } catch {
          // ignore
        }

        return Promise.reject(
          new ApiError(
            msgFromServer ?? "未登录或登录已过期",
            "UNAUTHORIZED",
            401,
          ),
        );
      }

      // 403：无权限
      if (status === 403) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "没有权限", "FORBIDDEN", 403),
        );
      }

      // 4xx：参数/请求错误
      if (status >= 400 && status < 500) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "请求参数错误", "BAD_REQUEST", status),
        );
      }

      // 5xx：服务器错误
      if (status >= 500) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "服务器异常", "SERVER_ERROR", status),
        );
      }

      // 兜底
      return Promise.reject(
        new ApiError(msgFromServer ?? "未知错误", "UNKNOWN", status),
      );
    },
  );

  return instance;
}

export const http = createHttpClient();

/**
 * request<T>
 * - 默认按“统一壳 ApiResponse<T>”解析，返回 data
 * - 如果接口不是统一壳（res.data 不是 {code,msg,data}），则直接返回 res.data
 *
 * 这样你既能继续享受统一壳带来的简洁，
 * 又不会被“非统一壳接口”坑到返回 undefined。
 */
export async function request<T>(
  config: Parameters<AxiosInstance["request"]>[0],
): Promise<T> {
  const res = await http.request(config);

  const payload = res.data as ApiResponse<T>;

  // ✅ 统一壳：返回 data
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as any).code === "number" &&
    typeof (payload as any).msg === "string" &&
    "data" in (payload as any)
  ) {
    return (payload as ApiResponse<T>).data;
  }

  // ✅ 非统一壳：直接返回 res.data
  return res.data as T;
}
