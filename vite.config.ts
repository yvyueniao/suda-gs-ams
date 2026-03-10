// vite.config.ts
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const USE_MOCK = env.VITE_USE_MOCK === "true"; // 通过环境变量控制 mock 的开关

  /**
   * ✅ 关键修改
   *
   * 默认 base 改为 "./"
   *
   * 好处：
   * - 构建后的静态资源使用相对路径
   * - 可以部署在任意子目录
   * - 不再依赖服务器 root
   *
   * 例如：
   *  http://domain/
   *  http://domain/app/
   *  http://domain/union/
   *
   * 都可以正常访问。
   */
  const BASE = env.VITE_BASE || "./";

  return {
    plugins: [react(), mockPlugin(USE_MOCK)],

    base: BASE,

    // ✅ Sentry Source Maps
    build: {
      sourcemap: true,
    },

    server: {
      host: true, // 允许局域网访问
      port: 5173,
      strictPort: true,

      // 允许 cpolar 域名
      allowedHosts: [".cpolar.top"],

      proxy: USE_MOCK
        ? undefined
        : {
            "/api": {
              target: "http://suda_union.zhongyaohui.club/",
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
    },
  };
});
