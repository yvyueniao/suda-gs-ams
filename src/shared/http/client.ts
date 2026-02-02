import axios, { AxiosError, AxiosInstance } from "axios";
import type { ApiResponse } from "./types";
import { ApiError } from "./error";
import { getToken, clearToken } from "../session/token";

// ✅ 关键：开发期走同源代理 /api
const BASE_URL = "/api";

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
      config.headers.Authorization = token;
    }
    return config;
  });

  // ✅ 响应拦截：按统一壳 code/msg 处理
  instance.interceptors.response.use(
    (res) => {
      const payload = res.data as ApiResponse<unknown>;

      // 非统一壳：直接放过
      if (
        !payload ||
        typeof payload.code !== "number" ||
        typeof payload.msg !== "string"
      ) {
        return res;
      }

      // code != 200：抛后端 msg
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
      if (error.code === "ECONNABORTED") {
        return Promise.reject(new ApiError("请求超时，请稍后重试", "TIMEOUT"));
      }

      if (!error.response) {
        return Promise.reject(
          new ApiError("网络异常，请检查网络或后端服务", "NETWORK_ERROR"),
        );
      }

      const status = error.response.status;
      const data: any = error.response.data;
      const msgFromServer = data?.msg || data?.message;

      if (status === 401) {
        clearToken();
        return Promise.reject(
          new ApiError(
            msgFromServer ?? "未登录或登录已过期",
            "UNAUTHORIZED",
            401,
          ),
        );
      }

      if (status === 403) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "没有权限", "FORBIDDEN", 403),
        );
      }

      if (status >= 400 && status < 500) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "请求参数错误", "BAD_REQUEST", status),
        );
      }

      if (status >= 500) {
        return Promise.reject(
          new ApiError(msgFromServer ?? "服务器异常", "SERVER_ERROR", status),
        );
      }

      return Promise.reject(
        new ApiError(msgFromServer ?? "未知错误", "UNKNOWN", status),
      );
    },
  );

  return instance;
}

export const http = createHttpClient();

export async function request<T>(
  config: Parameters<AxiosInstance["request"]>[0],
): Promise<T> {
  const res = await http.request<ApiResponse<T>>(config);
  return res.data.data;
}
