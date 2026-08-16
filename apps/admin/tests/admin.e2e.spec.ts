import { test, expect } from "@playwright/test";

const manifest = {
  version: 1,
  contentHash: "a".repeat(64),
  apiRoutes: [],
  ui: {
    routes: [{ route_key: "studio", path: "/", screen_key: "studio", enabled: true }],
    navigation: [{ route_key: "studio", screen_key: "studio", label_key: "nav.studio", icon_key: null, order_index: 1, required_capability: null, feature_flag: null, enabled: true }],
  },
  catalog: [],
  tokens: [],
  featureFlags: {},
};

test.beforeEach(async ({ page }) => {
  await page.route("**/runtime-manifest", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(manifest) }));
});

test("admin critical reads fail closed without an injected session", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación de Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
  await expect(page.getByText("Insufficient privilege for wallet data.")).toBeVisible();
  await expect(page.getByText("Insufficient privilege for unit economics data.")).toBeVisible();
  await expect(page.getByText("Insufficient privilege for ledger data.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish configuration" })).toBeDisabled();
});

test("admin remains usable at mobile widths with keyboard-visible landmarks", async ({ page }) => {
  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(overflow, `mobile overflow at ${width}: ${JSON.stringify(dimensions)}`).toBeFalsy();
    const targets = await page.locator("button, a").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(targets.every((height) => height >= 44), `small touch target at ${width}: ${JSON.stringify(targets)}`).toBeTruthy();
  }

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
