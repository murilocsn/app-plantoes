import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.API_TARGET || "http://localhost:3333";

  return {
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT || 5173),
      proxy: {
        "/api": apiTarget,
      },
    },
  };
});
