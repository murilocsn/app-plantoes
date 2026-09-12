import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const envDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const env = loadEnv(mode, envDir, "");
  const apiTarget = env.API_TARGET || "http://localhost:3333";
  const isProduction = mode === "production";

  return {
    plugins: [react()],
    base: isProduction ? "/app-plantoes/" : "/",
    envDir,
    server: {
      port: Number(env.WEB_PORT || 5173),
      proxy: {
        "/api": apiTarget,
      },
    },
  };
});
