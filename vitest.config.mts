import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: "node",
    // The production container runs in UTC (no TZ set in the Dockerfile).
    // Running tests in UTC too means a missing explicit timeZone in date
    // formatting fails here, regardless of the developer machine's timezone.
    env: { TZ: "UTC" },
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "app/generated/**"],
  },
});
