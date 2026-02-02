import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    base: command === "build" ? "/suda-gs-ams/" : "/",
    server: {
      proxy: {
        "/api": {
          target: "https://40f408e3.r26.cpolar.top",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
