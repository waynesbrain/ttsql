import { resolve } from "node:path";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

// https://vite.dev/config/
export default defineConfig({
  publicDir: false,
  build: {
    // assetsInlineLimit: 0, // Consider if CSS gets inline?
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      name: "ttsql",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["@sinclair/typebox"],
      // output: {
      //   globals: {
      //     "@sinclair/typebox": "@sinclair/typebox",
      //   },
      // },
    },
    sourcemap: true,
    emptyOutDir: true,
    outDir: "./dist",
  },
  plugins: [
    /**
     * Generate d.ts files.
     * See https://github.com/vitejs/vite/issues/2049
     */
    typescript({
      declaration: true,
      emitDeclarationOnly: true,
      jsx: "react-jsx",
      tsconfig: resolve(__dirname, "tsconfig.app.json"),
      compilerOptions: {
        rootDir: "./src",
        outDir: resolve(__dirname, "./dist"),
        declaration: true,
        declarationMap: true,
        emitDeclarationOnly: true,
        /**
         * Fix error `@rollup/plugin-typescript TS5096: Option
         * 'allowImportingTsExtensions' can only be used when either 'noEmit'
         * or 'emitDeclarationOnly' is set.`
         */
        allowImportingTsExtensions: false,
        noEmit: false,
      },
    }),
  ],
});
