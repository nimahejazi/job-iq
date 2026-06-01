import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest covers fast unit/component tests; async Server Component behavior should use E2E tests later.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
