/** @file Vitest Workspace. See https://vitest.dev/guide/workspace.html */
import { defineWorkspace } from "vitest/config";
import tsconfigPathsPlugin from "vite-tsconfig-paths";

const tsconfigPaths = tsconfigPathsPlugin();

export default defineWorkspace([
  {
    plugins: [tsconfigPaths],
    test: {
      name: "ttsql",
      environment: "node",
      include: ["src/**/*.test.{ts,js}"],
      bail: 1,
    },
  },
]);
