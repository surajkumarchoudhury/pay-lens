import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pin the timezone so date-formatting tests are deterministic regardless of the
// machine / CI runner locale. Set before any Date is constructed.
process.env.TZ = "UTC";

/**
 * Unit-test config. These tests cover the app's pure logic (money, stats,
 * salary bands, validators, CSV, dates, search-param parsing) — no DOM, no DB —
 * so they run fast and deterministically in the Node environment. The `@/`
 * alias mirrors tsconfig so tests import modules exactly as the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
