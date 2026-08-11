import { test, expect } from "@playwright/test";
test("screenshots 320/360/430 + fps", async ({ page }) => {
  await page.route("**/runtime-manifest", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ manifest_version: 1, routes: [], tokens: [], navigation: [], catalog: [], feature_flags: {} }) }));
  await page.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }));
  for (const w of [320, 360, 430]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto("/");
    await expect(page.getByText("RouterGo")).toBeVisible();
    await page.screenshot({ path: `test-results/screenshot-${w}.png`, fullPage: true });
    const fps = await page.evaluate(async () => {
      let frames = 0;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          frames++;
          if (performance.now() - start < 500) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return Math.round((frames * 1000) / 500);
    });
    expect(fps).toBeGreaterThan(30);
  }
});
