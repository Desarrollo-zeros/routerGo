import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "apps/admin/tests",
  use: { baseURL: "http://localhost:5174", trace: "on-first-retry" },
  webServer: {
    command: "pnpm --filter @routergo/admin dev",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
