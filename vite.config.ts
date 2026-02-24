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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const USE_MOCK = env.VITE_USE_MOCK === "true"; // 通过环境变量控制 mock 的开关

  // ✅ 新增：允许用环境变量覆盖 base（用于本地 preview/不同部署环境）
  // - 未设置 VITE_BASE 时：保持你原来的逻辑（build -> /suda-gs-ams/，否则 -> /）
  const BASE = env.VITE_BASE || (command === "build" ? "/suda-gs-ams/" : "/");

  return {
    plugins: [react(), mockPlugin(USE_MOCK)], // 在开发模式中启用 mock 数据

    base: BASE,

    // ✅ 新增：Sentry Source Maps 需要（dist 里会生成 .map 文件）
    // - 生产环境通常建议开（方便反混淆堆栈）
    // - 注意：source map 属于“源码信息”，请确保只上传到 Sentry，
    //   不要把 dist/*.map 公开托管给用户访问（可在服务器侧禁掉 .map 访问）
    build: {
      sourcemap: true,
    },

    server: {
      host: true, // ✅ 允许局域网访问（等价于 0.0.0.0）
      port: 5173, // ✅ 固定端口（建议固定，方便内网访问）
      strictPort: true, // ✅ 端口被占用直接报错，不自动换端口

      // ✅ 允许通过 cpolar 域名访问（解决 Blocked request: host is not allowed）
      // 推荐：放行整个 cpolar 后缀，避免每次域名变更都要改配置
      allowedHosts: [".cpolar.top"],

      // 如果你更想“只放行当前这个域名”，用下面这一行替换上面 allowedHosts 即可：
      // allowedHosts: ["6566ca4f.r17.cpolar.top"],

      proxy: USE_MOCK
        ? undefined // 如果启用了 mock 服务，则不需要代理
        : {
            "/api": {
              target: "http://9a3b08.r26.cpolar.top", // 真实后端地址
              changeOrigin: true, // 修改请求头中的 origin 字段为目标地址
              secure: false, // 如果是 https 协议，是否验证 SSL 证书
              rewrite: (path) => path.replace(/^\/api/, ""), // 将路径中的 /api 替换为空，确保后端能正确识别
            },
          },
    },
  };
});
