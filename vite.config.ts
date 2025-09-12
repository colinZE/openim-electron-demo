import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
import legacy from "@vitejs/plugin-legacy";
// import visualizer from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const sourcemap = command === "serve" || !!process.env.VSCODE_DEBUG;

  return {
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    plugins: [
      react(),
      // 启用legacy支持，确保移动端兼容性
      legacy({
        targets: ["defaults", "not IE 11"],
      }),
      // visualizer({ open: true }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    clearScreen: false,
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            // 保持 WASM 文件的原始名称
            if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
              return '[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          // manualChunks: {
          //   // 代码分割优化
          //   vendor: ['react', 'react-dom'],
          //   antd: ['antd'],
          //   openim: ['@openim/electron-client-sdk', '@openim/wasm-client-sdk'],
          // },
        },
      },
    },
  };
});
