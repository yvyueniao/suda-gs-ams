import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { setupMock } from "./src/mock"; // ✅ mock 后端数据的相关配置

function mockPlugin(enabled: boolean): Plugin {
  return {
    name: "suda-mock-server",
    apply: "serve", // 仅在开发时启用
    configureServer(server) {
      if (!enabled) return;

      // 注册 mock 路由
      setupMock(server.middlewares);
      console.log(
        "\n[mock] enabled: mock routes registered via src/mock/index.ts\n",
      );
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const USE_MOCK = env.VITE_USE_MOCK === "true"; // 通过环境变量控制 mock 的开关

  return {
    plugins: [react(), mockPlugin(USE_MOCK)], // 在开发模式中启用 mock 数据

    base: command === "build" ? "/suda-gs-ams/" : "/",

    server: {
      proxy: USE_MOCK
        ? undefined // 如果启用了 mock 服务，则不需要代理
        : {
            "/api": {
              target: "https://30e9618e.r26.cpolar.top", // 真实后端地址
              changeOrigin: true, // 修改请求头中的 origin 字段为目标地址
              secure: false, // 如果是 https 协议，是否验证 SSL 证书
              rewrite: (path) => path.replace(/^\/api/, ""), // 将路径中的 /api 替换为空，确保后端能正确识别
            },
          },
    },
  };
});
