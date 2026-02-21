import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          articleHowItWorks: path.resolve(
            __dirname,
            "article/how-it-works/index.html"
          ),
          articleIntentLayer: path.resolve(
            __dirname,
            "article/intent-layer/index.html"
          ),
        },
      },
    },
  };
});
