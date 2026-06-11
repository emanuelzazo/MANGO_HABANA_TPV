import { test, expect } from '@playwright/test';

const SHOTS = '/tmp/cc-work/shots';

const PRODUCTS = [
  { id: 101, woo_id: 101, sku: 'MH-CAM-001', codigo_barras: 'MH-CAM-001', nombre: 'Camiseta Blanca Básica', precio: 15, precio_oferta: null, precio_regular: 15, stock: 25, categoria: 'Camisetas', imagen_url: null, activo: true, gestionar_stock: true },
  { id: 102, woo_id: 102, sku: 'MH-VES-001', codigo_barras: 'MH-VES-001', nombre: 'Vestido Negro Elegante', precio: 80, precio_oferta: null, precio_regular: 80, stock: 10, categoria: 'Vestidos', imagen_url: null, activo: true, gestionar_stock: true },
  { id: 103, woo_id: 103, sku: 'MH-ACC-001', codigo_barras: 'MH-ACC-001', nombre: 'Cinturón Piel Marrón', precio: 20, precio_oferta: null, precio_regular: 20, stock: 25, categoria: 'Accesorios', imagen_url: null, activo: true, gestionar_stock: true },
];

async function seedDB(page, products) {
  await page.evaluate((prods) => new Promise((resolve, reject) => {
    const req = indexedDB.open('tpv_mango_habana', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('ventas')) { const s = db.createObjectStore('ventas', { keyPath: 'id' }); s.createIndex('fecha', 'fecha'); s.createIndex('usuario_id', 'usuario_id'); s.createIndex('dependienta', 'dependienta'); }
      if (!db.objectStoreNames.contains('sync_log')) db.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('productos_cache')) { const p = db.createObjectStore('productos_cache', { keyPath: 'id' }); p.createIndex('sku', 'sku'); p.createIndex('codigo_barras', 'codigo_barras'); }
      if (!db.objectStoreNames.contains('currency_rates')) { const r = db.createObjectStore('currency_rates', { keyPath: 'id', autoIncrement: true }); r.createIndex('date', 'date'); }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('productos_cache', 'readwrite');
      prods.forEach(p => tx.objectStore('productos_cache').put(p));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), products);
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', d => d.accept());
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('tpv_currency_config', JSON.stringify({ primary: 'CUP', secondary: 'USD', exchange_rate: 600, source: 'manual' })); });
  await seedDB(page, PRODUCTS);
  // Sin login: la app entra directa tras recargar.
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => page.goto('/', { waitUntil: 'domcontentloaded' }));
  await page.waitForTimeout(600);
});

test('navegación por módulos + capturas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true });

  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: 'Punto de Venta' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/02-pos.png`, fullPage: true });

  await page.goto('/inventory');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/03-inventory.png`, fullPage: true });

  await page.goto('/sales');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/04-sales.png`, fullPage: true });

  await page.goto('/settings');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/05-settings.png`, fullPage: true });
});

test('venta completa con transferencia (+20%) y guardado', async ({ page }) => {
  await page.goto('/pos');
  // El grid carga desde la caché sembrada
  const card = page.getByText('Vestido Negro Elegante').first();
  await expect(card).toBeVisible({ timeout: 8000 });
  await card.click();

  // Item en carrito
  await expect(page.getByText('TOTAL', { exact: true })).toBeVisible();

  // Selector de dependienta presente
  await expect(page.locator('select').first()).toBeVisible();

  // Descuento rápido 10%
  await page.getByRole('button', { name: '10%' }).first().click();

  // Cobrar
  await page.getByRole('button', { name: /Cobrar/ }).click();
  await expect(page.getByText('Total a cobrar')).toBeVisible();

  // Método Transferencia → recargo 20% por defecto (precios en USD)
  await page.getByRole('button', { name: 'Transferencia' }).click();
  await expect(page.getByText(/Recargo transferencia/).first()).toBeVisible();

  // total: 80 - 10% = 72; +20% = 86.40 (USD) → confirma que el recargo se aplicó
  await expect(page.getByRole('button', { name: /Confirmar \$86\.40/ })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/06-pago-transferencia.png` });
  await page.getByRole('button', { name: /Confirmar/ }).click();

  // Post-venta
  await expect(page.getByText('¡Cobro completado!')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/Incluye recargo 20%/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-venta-ok.png` });
  await page.getByRole('button', { name: 'Nueva venta' }).click();

  // Guardado: comprobar en Historial
  await page.goto('/sales');
  await page.waitForTimeout(800);
  await expect(page.getByText('V-00001')).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}/08-historial.png`, fullPage: true });
});

test('efectivo USD con cambio', async ({ page }) => {
  await page.goto('/pos');
  await page.getByText('Cinturón Piel Marrón').first().click(); // precio 20 USD
  await page.getByRole('button', { name: /Cobrar/ }).click();

  // Efectivo en USD: total $20, paga $25 → cambio $5
  await page.getByRole('button', { name: 'Efectivo' }).click();
  await page.getByRole('button', { name: 'USD', exact: true }).click();
  await page.locator('input[type="number"]').fill('25');
  await expect(page.getByText('Cambio')).toBeVisible();
  await expect(page.getByText('$5.00')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/09-efectivo-usd.png` });
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByText('¡Cobro completado!')).toBeVisible({ timeout: 8000 });
});

test('búsqueda por SKU añade al carrito', async ({ page }) => {
  await page.goto('/pos');
  const input = page.getByPlaceholder(/Escanear código/);
  await input.fill('MH-CAM-001');
  await input.press('Enter');
  // Añadido al carrito → aparece el total y el producto en grid + carrito (2)
  await expect(page.getByText('TOTAL', { exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Camiseta Blanca Básica')).toHaveCount(2);
});

test('Cmd/Ctrl+V en cualquier parte (Dashboard) añade al carrito y abre POS', async ({ page }) => {
  // Estamos en el Dashboard (sin campo de texto enfocado), como pediste
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  // Pone el SKU en el portapapeles y pega con el atajo de teclado real
  await page.evaluate((sku) => navigator.clipboard.writeText(sku), 'MH-VES-001');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('ControlOrMeta+v');
  // Debe saltar a la caja (/pos) con el producto en el carrito
  await expect(page).toHaveURL(/\/pos/, { timeout: 8000 });
  await expect(page.getByText('TOTAL', { exact: true })).toBeVisible({ timeout: 8000 });
  // Una sola Cmd+V = UNA unidad (Vestido $80, no $160)
  await expect(page.getByRole('button', { name: /Cobrar \$80\.00/ })).toBeVisible({ timeout: 5000 });
});

test('cobro DESGLOSADO (mixto): transferencia + USD + CUP cubre el total', async ({ page }) => {
  await page.goto('/pos');
  await page.getByText('Vestido Negro Elegante').first().click({ timeout: 8000 }); // $80
  await page.getByRole('button', { name: /Cobrar/ }).click();
  await page.getByRole('button', { name: 'Desglosado' }).click();
  // Inputs del desglose en orden: Transferencia, Efectivo USD, Efectivo CUP, Efectivo EUR
  const inputs = page.locator('[data-modal] input[type="number"]');
  await inputs.nth(0).fill('12000');  // 12.000 CUP transferencia = $20 base (tasa 600), +20% recargo
  await inputs.nth(1).fill('20');     // 20 USD efectivo
  await inputs.nth(2).fill('24000');  // 24.000 CUP = 40 USD
  // base cubierta: 20 + 20 + 40 = 80 = total → cubierto
  await expect(page.getByText('Cubierto')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByText('¡Cobro completado!')).toBeVisible({ timeout: 8000 });
});

test('Reporte de Tasas y cortes quincenales del Calendario renderizan', async ({ page }) => {
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Tasas' }).click();
  await expect(page.getByText('1 USD (hoy)')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('1 EUR (hoy)')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-tasas.png`, fullPage: true });

  await page.goto('/calendar');
  await expect(page.getByText('Cortes quincenales')).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('11 – 25')).toBeVisible();
  await expect(page.getByText('26 – 10')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/13-calendario.png`, fullPage: true });
});
