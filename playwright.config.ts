import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "apps/web/tests",
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: {
    command: "pnpm --filter @routergo/web dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
