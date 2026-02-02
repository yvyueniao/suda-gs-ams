import type { LoginPayload, User } from "./model";

/**
 * 登录接口（Fake API）
 * 后续可以直接替换为 axios / fetch 实现
 */
export async function login(payload: LoginPayload): Promise<User> {
  const { account, password } = payload;

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 写死的账号密码（后期删）
  if (account === "20254227033" && password === "@feifei1207") {
    return {
      id: "u001",
      name: "管理员",
      role: "ADMIN",
    };
  }

  if (account === "minister" && password === "123456") {
    return {
      id: "u002",
      name: "部长",
      role: "MINISTER",
    };
  }

  // 登录失败
  return Promise.reject(new Error("账号或密码错误"));
}
