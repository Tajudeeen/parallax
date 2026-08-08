import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Resolve every @parallax/* import to the package's TypeScript source so the
// unit tests run against source without a prior build step.
export default defineConfig({
  resolve: {
    alias: {
      "@parallax/types": r("./packages/types/src/index.ts"),
      "@parallax/config": r("./packages/config/src/index.ts"),
      "@parallax/shared": r("./packages/shared/src/index.ts"),
      "@parallax/database": r("./packages/database/src/index.ts"),
      "@parallax/datahub": r("./packages/datahub/src/index.ts"),
      "@parallax/ai": r("./packages/ai/src/index.ts"),
      "@parallax/orchestrator": r("./packages/orchestrator/src/index.ts"),
      "@parallax/engine-atlas": r("./packages/engines/atlas/src/index.ts"),
      "@parallax/engine-prism": r("./packages/engines/prism/src/index.ts"),
      "@parallax/engine-sentinel": r("./packages/engines/sentinel/src/index.ts"),
      "@parallax/engine-echo": r("./packages/engines/echo/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
