import { test, expect } from '@playwright/test';

const WOO = {
  url: 'https://writeproperty.s3-tastewp.com',
  key: 'ck_ba97fffc445f4999d93d6ba84e788eaac76895c5',
  secret: 'cs_40fea1db3748a0b4449a0d2b40e1f9b70ed90c39',
};

test('Probar conexión WooCommerce con claves reales (desde la app)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500); // sin login: entra directo
  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('https://mangohabana.com')).toBeVisible({ timeout: 8000 });
  await page.getByPlaceholder('https://mangohabana.com').fill(WOO.url);
  await page.getByPlaceholder('ck_...').fill(WOO.key);
  await page.getByPlaceholder('cs_...').fill(WOO.secret);

  await page.getByRole('button', { name: /Probar conexión/ }).click();

  // Éxito real: la app muestra el toast de conexión establecida
  await expect(page.getByText(/Conexión con WooCommerce establecida/)).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: '/tmp/cc-work/shots/11-woo-ok.png' });
});
