import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// ✅ 你的 mock 注册函数（你之前要创建的文件）
import { setupAuthMock } from "./src/mock/auth.mock";

function mockPlugin(enabled: boolean): Plugin {
  return {
    name: "suda-mock-server",
    apply: "serve", // ✅ 只在 dev server 生效
    configureServer(server) {
      if (!enabled) return;

      // 注册 mock 路由
      setupAuthMock(server.middlewares);

      // 方便你在终端确认当前模式
      console.log("\n[mock] enabled: auth mock routes registered\n");
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // ✅ 环境变量控制：true => mock；false => proxy
  const USE_MOCK = env.VITE_USE_MOCK === "true";

  return {
    plugins: [react(), mockPlugin(USE_MOCK)],
    base: command === "build" ? "/suda-gs-ams/" : "/",

    server: {
      // ✅ mock 模式：不要 proxy（否则请求会被转发走，mock 接不到）
      // ✅ real 模式：启用 proxy，转发到真实后端
      proxy: USE_MOCK
        ? undefined
        : {
            "/api": {
              target: "https://43cd5493.r26.cpolar.top",
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
    },
  };
});
