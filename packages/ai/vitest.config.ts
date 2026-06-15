import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    isolate: false,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.yarn/**"],
  },
});
