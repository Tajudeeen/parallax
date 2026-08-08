import { defineConfig } from "@playwright/test";

// Smoke-tests the built web SPA in a real Chromium: the app must mount
// without runtime/hook errors and serve its routes.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  webServer: {
    command: "npm run build --workspace @parallax/web && npm run preview --workspace @parallax/web -- --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
