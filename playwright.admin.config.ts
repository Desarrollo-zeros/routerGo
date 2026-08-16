import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "apps/admin/tests",
  use: { baseURL: "http://localhost:5176", trace: "on-first-retry" },
  webServer: {
    command: "pnpm --filter @routergo/admin exec vite --host --port 5176",
    url: "http://localhost:5176",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
