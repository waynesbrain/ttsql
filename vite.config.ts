import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

const input = readdirSync(resolve(__dirname, "./src"))
  .filter((path) => path.endsWith(".ts"))
  .map((it) => resolve(__dirname, "src", it));

// https://vite.dev/config/
export default defineConfig({
  publicDir: false,
  build: {
    // assetsInlineLimit: 0, // Consider if CSS gets inline?
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      name: "ttsql",
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      input,
      // input: [
      //   resolve(__dirname, "./src/index.ts"),
      //   resolve(__dirname, "./src/d1.ts"),
      //   resolve(__dirname, "./src/db.ts"),
      // ],
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
