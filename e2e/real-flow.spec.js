import { test, expect } from '@playwright/test';

const SHOTS = '/tmp/cc-work/shots';
const WOO = {
  url: 'https://writeproperty.s3-tastewp.com',
  key: 'ck_ba97fffc445f4999d93d6ba84e788eaac76895c5',
  secret: 'cs_40fea1db3748a0b4449a0d2b40e1f9b70ed90c39',
};

// Inyecta config WooCommerce + moneda ANTES de que cargue la app.
test.beforeEach(async ({ page }) => {
  page.on('dialog', d => d.accept()); // aceptar confirmaciones (sin stock, etc.)
  await page.addInitScript((woo) => {
    localStorage.setItem('tpv_woo_config', JSON.stringify(woo));
    localStorage.setItem('tpv_currency_config', JSON.stringify({ primary: 'CUP', secondary: 'USD', exchange_rate: 600, source: 'manual' }));
  }, WOO);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600); // sin login: entra directo
});

test('todos los módulos cargan + capturas de diseño', async ({ page }) => {
  test.setTimeout(90000);
  const modulos = [
    ['/', 'r01-dashboard'],
    ['/pos', 'r02-pos'],
    ['/inventory', 'r03-inventory'],
    ['/products', 'r04-products'],
    ['/sales', 'r05-sales'],
    ['/calendar', 'r06-calendar'],
    ['/reports', 'r07-reports'],
    ['/exports', 'r08-exports'],
    ['/staff', 'r09-staff'],
    ['/settings', 'r10-settings'],
  ];
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const [path, name] of modulos) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2800); // dar tiempo a la carga en vivo de WooCommerce
    await expect(page.locator('aside')).toBeVisible(); // sidebar siempre presente
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  }
  expect(errors, `errores JS en módulos: ${errors.join(' | ')}`).toEqual([]);
});

test('POS carga productos reales de WooCommerce', async ({ page }) => {
  await page.goto('/pos', { waitUntil: 'domcontentloaded' });
  // Grid en vivo desde la tienda real
  await expect(page.getByText('Vestido Negro Elegante')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Camiseta Blanca Básica')).toBeVisible();
  // Precio real (80 → $80.00)
  await expect(page.getByText('$80.00')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/r11-pos-productos-reales.png`, fullPage: true });
});

test('alta de dependienta (solo nombre) y cambio en el carrito', async ({ page }) => {
  // Alta solo con nombre, sin login
  await page.goto('/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Nueva dependienta/ }).click();
  await page.getByRole('textbox').first().fill('Ana López');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Ana López')).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/r12-dependientas.png`, fullPage: true });

  // Cambio en el carrito (sin contraseña)
  await page.goto('/pos', { waitUntil: 'domcontentloaded' });
  await page.getByText('Cinturón Piel Marrón').first().click({ timeout: 15000 });
  const sel = page.locator('select').first();
  await expect(sel).toBeVisible();
  await sel.selectOption({ label: 'Ana López' });
  await page.waitForTimeout(400);
  await expect(page.locator('aside').getByText('Ana López')).toBeVisible({ timeout: 5000 });
});

test('venta REAL end-to-end con sincronización a WooCommerce', async ({ page }) => {
  await page.goto('/pos', { waitUntil: 'domcontentloaded' });
  await page.getByText('Vestido Negro Elegante').first().click({ timeout: 15000 });
  await expect(page.getByText('TOTAL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Cobrar/ }).click();
  await page.getByRole('button', { name: 'Efectivo' }).click();
  await page.locator('input[type="number"]').fill('100');
  await expect(page.getByText('Cambio')).toBeVisible();
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByText('¡Cobro completado!')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/r13-venta-real-ok.png` });
  await page.getByRole('button', { name: 'Nueva venta' }).click();
  // Guardado local
  await page.goto('/sales', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/V-0000/)).toBeVisible({ timeout: 8000 });
});
