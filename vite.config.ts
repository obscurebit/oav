/// <reference types="vitest" />
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api/llm": {
        target: "https://integrate.api.nvidia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, "/v1"),
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
