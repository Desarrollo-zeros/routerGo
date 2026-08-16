import { expect, test } from "@playwright/test";

test("usuario real se registra, navega y recibe GoCredits", async ({ page }) => {
  const email = `real-${Date.now()}@routergo.local`;
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Iniciar sesión" })).toBeVisible();
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("routergo-real-123");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.getByRole("link", { name: "Actividad" })).toBeVisible();
  await expect(page.getByText(/ejercicios de peso corporal disponibles/)).toBeVisible({ timeout: 25_000 });

  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Elige tu forma de pensar." })).toBeVisible();
  await expect(page.getByText("Modelos disponibles")).toBeVisible();
  await page.screenshot({ path: "test-results/real-catalog.png", fullPage: true });

  const reward = await page.evaluate(async () => {
    const nonce = crypto.randomUUID();
    const response = await fetch("/api/activities/current/verify", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "idempotency-key": nonce },
      body: JSON.stringify({ reps: 4, sessionId: `real-${nonce}`, challenge_nonce: nonce }),
    });
    return { status: response.status, body: await response.json() as { credits?: string; newBalance?: string } };
  });
  expect(reward.status).toBe(200);
  expect(Number(reward.body.credits)).toBeGreaterThan(0);

  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Tu saldo, listo para usar." })).toBeVisible();
  await expect(page.getByText("Actividad de saldo")).toBeVisible();
  await expect(page.getByText(/GoCredits disponibles/)).toBeVisible();
  await page.screenshot({ path: "test-results/real-wallet.png", fullPage: true });

  await page.goto("/battles");
  await expect(page.getByRole("heading", { name: "Juega en tiempo real" })).toBeVisible();
  await page.screenshot({ path: "test-results/real-battles.png", fullPage: true });

  await page.goto("/treasure");
  await expect(page.getByRole("heading", { name: "Treasure hunts" })).toBeVisible();
});
