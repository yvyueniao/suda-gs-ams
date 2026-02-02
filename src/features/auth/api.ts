import { request } from "../../shared/http/client";
import type { LoginData, LoginPayload } from "./model";

export function login(payload: LoginPayload) {
  return request<LoginData>({
    url: "/suda_login",
    method: "POST",
    data: payload,
  });
}
