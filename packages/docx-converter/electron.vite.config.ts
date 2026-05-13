import { resolve } from "path";
import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";

// Explicit entry points are required by electron-vite even when paths are conventional.
// rollupOptions typing requires Vite 6 in electron-vite v5 types;
// @ts-ignore comments suppress the IDE mismatch — works at runtime.
export default defineConfig({
  // @ts-ignore
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "electron/main/index.ts") },
      },
    },
  },
  // @ts-ignore
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "electron/preload/index.ts") },
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [vue()],
    base: "./",
    build: {
      // rollupOptions typing requires Vite 6 in electron-vite v5;
      // this project uses Vite 5 for the web build. The @ts-ignore suppresses
      // the IDE-level mismatch — works correctly at runtime via electron-vite's esbuild.
      // @ts-ignore
      rollupOptions: {
        input: { index: resolve(__dirname, "index.html") },
      },
    },
  },
});
