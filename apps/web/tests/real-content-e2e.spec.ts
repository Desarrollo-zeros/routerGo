import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("PWA muestra patrocinio y ayuda desde datos persistidos", async ({ page }) => {
  const email = `content-${Date.now()}@routergo.local`;
  const registration = await page.request.post("/api/auth/register", { data: { email, password: "test-routergo-content-123" } });
  expect(registration.ok()).toBeTruthy();
  await page.goto("/");
  if (await page.getByRole("tab", { name: "Iniciar sesión" }).isVisible().catch(() => false)) {
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill("test-routergo-content-123");
    await page.getByRole("button", { name: "Entrar a RouterGo" }).click();
  }
  await expect(page.getByText("Entrena y recupera GoCredits")).toBeVisible({ timeout: 15_000 });
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Gana GoCredits" })).toBeVisible();
  await expect(page.getByText("Completa actividades verificadas")).toBeVisible();
  await page.screenshot({ path: "output/playwright/help-cms-real-mobile.png", fullPage: true });
});
