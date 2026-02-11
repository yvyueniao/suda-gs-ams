//vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

import { setupMock } from "./src/mock"; // ✅ 注意：默认会解析到 src/mock/index.ts

function mockPlugin(enabled: boolean): Plugin {
  return {
    name: "suda-mock-server",
    apply: "serve",
    configureServer(server) {
      if (!enabled) return;

      // ✅ 统一从 mock/index.ts 注册
      setupMock(server.middlewares);

      console.log(
        "\n[mock] enabled: mock routes registered via src/mock/index.ts\n",
      );
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const USE_MOCK = env.VITE_USE_MOCK === "true";

  return {
    plugins: [react(), mockPlugin(USE_MOCK)],
    base: command === "build" ? "/suda-gs-ams/" : "/",

    server: {
      proxy: USE_MOCK
        ? undefined
        : {
            "/api": {
              target: "https://571d10d2.r26.cpolar.top",
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
    },
  };
});
