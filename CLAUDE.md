# TPV Mango Habana — Documentación

**Última actualización:** 11 de junio de 2026

---

## Estado actual (resumen rápido para no re-descubrir)

- **Sin login**: se entra directo a la app. `authStore` arranca `isAuthenticated: true` y `ensureActiveUser()` (en `App.jsx`) fija el admin (`mango`) como usuario activo. Las dependientas/visores se dan de alta **solo con nombre** en Staff; el cambio rápido en el carrito usa `authStore.setActiveUser` (sin contraseña). Roles: `administrador`, `dependienta`, `visor` (solo lectura → el POS oculta el botón Cobrar).
- **Moneda: precios en USD** (principal). Debajo se muestran **CUP y EUR** (`formatCup(usd)`, `formatEur(usd)`). Conversión y tasas en `src/utils/currency-converter.js`: `exchange_rate` (CUP/USD efectiva) y `eur_rate` (CUP/EUR efectiva) = tasa cruda de El Toque + **margen propio por moneda** (`usd_margin`, `eur_margin`, independientes). Ajustes en Settings: factor manual USD y EUR por separado + botones de margen +10/+15/+20 para cada uno.
- **El Toque**: `src/api/elTouqueClient.js` trae USD y EUR. Acceso según entorno: **Electron** → IPC `window.electronAPI.eltoqueFetch`; **web dev** → proxy Vite `/eltoque-api`; **web prod (Vercel)** → función serverless `/api/eltoque`. `ensureTodayRate()` registra la tasa del día en IndexedDB (`currency_rates`) para el **reporte de Tasas** (Reports → gráfico USD/EUR por día).
- **Escáner = wedge global de teclado + pegar** en `src/components/GlobalScanner.jsx` (montado en `AppLayout`, sin UI). **Cmd/Ctrl+V en cualquier pantalla** lee el portapapeles (`navigator.clipboard.readText`) → resuelve el producto (`src/utils/resolveProduct.js`, **caché local primero**) → lo añade al carrito y salta a `/pos`. Un solo manejador (keydown) con anti-rebote. El buscador del POS filtra localmente (instantáneo, por nombre/SKU/código).
- **Añadir al carrito**: `src/utils/addProductToCart.js` (sin toast; si no hay stock, `window.confirm`).
- **Velocidad**: POS, Inventario y Dashboard cargan **cache-first** (IndexedDB al instante + refresco WooCommerce en segundo plano).
- **Pagos** (PaymentModal en `POS.jsx`): **Efectivo** (USD/CUP), **Transferencia** (recargo 10-40 %, def. 20 %) y **Desglosado/mixto** (reparte el pago entre transferencia [CUP], efectivo USD/CUP/EUR; calcula cubierto/restante/cambio en base USD). La venta guarda `pagos[]`, `recargo`, `moneda` y `tasas` (snapshot). El éxito se muestra **al instante**; la sync a WooCommerce va en segundo plano.
- **Impresión** (`src/utils/print.js`): en **Electron** imprime nativo/silencioso a la impresora configurada (IPC `printHTML`); en navegador, iframe oculto. **N copias** (config `copias`). El vale muestra el **código `[SKU]`** junto al producto, "Transferencia X%", desglose de pagos, tasa del día y USD+CUP+EUR.
- **Modal** (`src/components/ui/Modal.jsx`): cierra solo si el clic empieza **y** termina en el overlay (mousedown+mouseup) → ya **no se cierra al seleccionar texto** dentro.
- **Copia de seguridad bidireccional** (Settings): **Exportar todo** / **Importar** (config + usuarios + impresoras + ventas en JSON) y **Reset** (descarga copia y borra ventas). Funciones en `src/utils/db.js` (`bulkSaveVentas`, `clearAllVentas`).
- **WooCommerce**: config en `localStorage.tpv_woo_config` `{ url, key, secret }`. Es la **base compartida** entre dispositivos (multi-usuario). Ver [[woocommerce-testing]]. ⚠️ La tienda de pruebas es TasteWP **temporal y suele estar caída** — usar datos sembrados en e2e.
- **Pruebas E2E**: Playwright en `e2e/` (`npx playwright test`, `npm run dev` arrancado). `app.spec.js` (seeded, no necesita tienda) cubre módulos, venta transferencia/efectivo/**desglosado**, pegar-para-añadir, reporte de tasas y quincenas. `real-flow.spec.js`/`woo.spec.js` requieren tienda WooCommerce viva.

## Multiplataforma — Escritorio (Electron) + Web (Vercel)

La misma base de código corre como **web** (Vercel) y como **app de escritorio Windows/Mac** (Electron). `App.jsx` usa `HashRouter` en Electron y `BrowserRouter` en web; `vite.config.js` usa `base: './'` cuando `ELECTRON_BUILD=1`.

- **Archivos Electron**: `electron/main.cjs` (ventana + IPC: `get-printers`, `print-html`, `eltoque-fetch`), `electron/preload.cjs` (expone `window.electronAPI`). `package.json` tiene `main`, `build` (electron-builder, target **nsis x64**) y scripts.
- **Compilar el .exe (en Windows)**: `npm install` → `npm run dist:win`. Salida en `release/`. Requiere las devDeps `electron`, `electron-builder`, `concurrently`, `cross-env`, `wait-on` (ya declaradas; instalar con `npm install`).
- **Desarrollo Electron**: `npm run electron:dev` (levanta Vite + Electron apuntando al dev server).
- **Compatibilidad Windows**: todo es JS/Node multiplataforma; los `electron/*.cjs` son CommonJS; las rutas usan `path.join`. No hay binarios nativos. Si algo falla en Windows suele ser: (1) `npm install` no instaló electron (red), (2) antivirus bloquea el `.exe` sin firmar (firmar o crear excepción), (3) impresora: usar el nombre exacto de Windows en Settings → Impresora.
- **Publicar en Vercel (web)**: repo → Vercel detecta `vercel.json` (build `vite build`, output `dist`, SPA rewrites). La función `api/eltoque.js` resuelve el CORS de El Toque en producción (opcional: variable de entorno `TOQUE_TOKEN`). La cámara/portapapeles necesitan HTTPS (Vercel ya da HTTPS).
- **Multi-usuario / sincronización**: WooCommerce es la base común. Ambos dispositivos se configuran con la **misma tienda** (Settings → WooCommerce); las ventas fluyen como pedidos y el stock se comparte. **Modo nube** (`salesStore.cloudMode`, por defecto ON; toggle en Settings): Historial, Reportes, Dashboard y Calendario leen la lista combinada **`useSalesList()`** = pedidos de WooCommerce (`orders.fetchOrders` → `normalizeOrder`) + ventas locales aún sin sincronizar. Así los dos equipos ven lo mismo; sin conexión, cae a lo local. Sin login, todos entran como **admin** (acceso total); el rol **visor** es opcional (solo lectura). ⚠️ Las dependientas y la config son **por equipo** (localStorage) → para copiarlas a otra PC, usar Exportar/Importar.
- **Aviso de sincronización**: si se vende sin internet, los pedidos quedan en cola (`syncStore.pendingOrders`, `localStorage tpv_pending_orders`) y se reintentan solos al volver la conexión (listener `online`). El **Dashboard** muestra un aviso discreto (`SyncNotice`) con botón "Sincronizar ahora".

## Visión

Sistema TPV (Punto de Venta) moderno y offline-first para tienda de moda **Mango Habana**. Soporte dual moneda **CUP/USD** con sincronización con WooCommerce, impresión térmica y gestión completa de inventario.

---

## Stack Tecnológico

- **Frontend:** React 19 + React Router 7 + TailwindCSS 4
- **Estado:** Zustand 5 (con Zustand persist middleware)
- **Persistencia:** IndexedDB (`idb` 8) para ventas/productos, localStorage para config
- **APIs externas:**
  - WooCommerce REST API v3 (tienda online)
  - El Toque API (tasas de cambio USD/CUP)
- **Utilidades:** jsPDF + AutoTable (reportes), XLSX (exportación Excel), Recharts (gráficos)
- **Bundler:** Vite 8

---

## Arquitectura

```
src/
├── pages/                # Rutas principales
│   ├── Login.jsx         # Autenticación
│   ├── Dashboard.jsx     # Panel principal (KPIs)
│   ├── POS.jsx          # PUNTO DE VENTA (core)
│   ├── Inventory.jsx    # Gestión inventario
│   ├── Products.jsx     # Catálogo
│   ├── SalesHistory.jsx # Histórico ventas
│   ├── Calendar.jsx     # Vista calendario
│   ├── Reports.jsx      # Reportes/análisis
│   ├── Exports.jsx      # Exportación datos
│   ├── Staff.jsx        # Gestión usuarios (admin)
│   └── Settings.jsx     # Configuración sistema
├── components/          # Componentes reutilizables
│   ├── ui/              # Botones, inputs, modales
│   └── layout/          # Sidebar, AppLayout
├── store/              # Zustand stores
│   ├── authStore.js    # Autenticación + usuarios
│   ├── cartStore.js    # Carrito (items, descuentos)
│   ├── salesStore.js   # Ventas + IndexedDB
│   ├── syncStore.js    # Cola sincronización
│   └── toastStore.js   # Notificaciones
├── api/                # Clientes HTTP
│   ├── woocommerceClient.js
│   ├── products.js
│   ├── orders.js
│   └── elTouqueClient.js (NUEVO)
├── utils/              # Funciones auxiliares
│   ├── db.js           # IndexedDB wrapper
│   ├── print.js        # Impresión térmica
│   ├── export.js       # Exportación PDF/Excel
│   ├── format.js       # Formateo (fechas, moneda)
│   ├── barcode.js      # Validación EAN-13
│   └── currency-converter.js (NUEVO)
└── App.jsx             # Router principal
```

---

## Flujo de Venta (Core POS)

```
1. LOGIN
   └─→ usuario/pass (admin/admin123 o maria/maria123)
   └─→ Almacena en authStore + localStorage

2. PANEL POS (src/pages/POS.jsx)
   ├─ BÚSQUEDA PRODUCTOS (SearchPanel)
   │  ├─ Escaneo código barras (mantiene foco)
   │  ├─ Búsqueda por nombre/SKU
   │  └─ Busca online (WooCommerce) → Fallback caché local
   │
   ├─ CARRITO (CartPanel + useCartStore)
   │  ├─ Agregar/eliminar items
   │  ├─ Cambiar cantidad (±)
   │  ├─ Descuentos (por item o total)
   │  ├─ Selector rápido de dependiente
   │  └─ Muestra total en DUAL MONEDA (CUP + USD)
   │
   └─ PAGO (PaymentModal)
      ├─ Método: Tarjeta / Efectivo
      ├─ Cálculo cambio automático
      ├─ Total mostrado en CUP (6000) y USD (10)
      └─ Confirmar

3. POST-VENTA
   ├─ Genera número ticket (V-00001)
   ├─ Guarda en IndexedDB (salesStore)
   ├─ IMPRIME VALE
   │  └─ HTML → navegador → print dialog
   │  └─ Incluye ambas monedas en precios/totales
   ├─ Intenta sincronizar con WooCommerce
   │  └─ Si offline → enqueue en pendingOrders
   └─ Limpia carrito, input mantiene foco
```

---

## Moneda: CUP / USD

### Conversión

**Factor por defecto:** `600 CUP = 1 USD`

**Ubicación config:** `localStorage.tpv_currency_config`

```javascript
{
  "primary": "CUP",           // Moneda primaria (local)
  "secondary": "USD",         // Moneda secundaria
  "exchange_rate": 600,       // CUP por 1 USD
  "last_sync": 1717584000000, // Timestamp último sync
  "source": "eltoque"         // "eltoque" | "manual" | "fallback"
}
```

### Actualizar Factor

1. **Manual:** Settings → Conversión de Moneda → ingresa factor → Guardar
2. **Automático:** Settings → Sincronizar con El Toque (consulta API en vivo)

### Mostrar Dual Moneda

Función: `formatDualCurrency(amount, showBoth=true)`

**Ejemplo:**
```
formatDualCurrency(6000)  → "$ 6.000,00 CUP ($10,00 USD)"
formatDualCurrency(6000, false)  → "$ 6.000,00 CUP"
```

**Ubicaciones donde aparece:**
- POS: precios productos
- Carrito: total antes/después descuento
- Modal pago: total a cobrar, cambio
- Vale impreso: todos precios y totales
- Post-venta: número + total ticket
- Settings: mostrar factor actual

---

## API: El Toque

**Archivo:** `src/api/elTouqueClient.js`

**Token JWT:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (expira Feb 2027)

**Endpoints:**
- `GET /rates` — Obtiene tasas actuales
  - Respuesta: `{ usd: 600, eur: 0.92, ... }`
  
**Comportamiento:**
- Intenta conexión con El Toque
- Si falla → usa factor guardado en config (fallback)
- Sincronización con retry (máx 2 intentos, espera 1s entre reintentos)
- Guarda histórico en IndexedDB (currency_rates store)

**Test conexión:**
```javascript
import { testElTouqueConnection } from './api/elTouqueClient';
const ok = await testElTouqueConnection();
```

---

## Autenticación

**Usuarios predeterminados:**
- `admin` / `admin123` — Rol: administrador (acceso total)
- `maria` / `maria123` — Rol: dependienta (POS + búsqueda)

**Almacenamiento:** localStorage (`tpv_users`) — **Fase 3: migrar a SQLite**

**Stores:**
- `useAuthStore` — estado autenticación
- `useAuthStore.getState().getUsers()` — lista usuarios activos

**Cambio rápido dependiente:** En POS.jsx, CartPanel tiene dropdown para cambiar usuario sin logout

---

## Ventas: Persistencia & Sincronización

### IndexedDB (tpv_mango_habana)

**Stores:**
```javascript
ventas              // Todas las ventas completadas
├─ keyPath: id (timestamp)
└─ índices: fecha, usuario_id, dependienta

sync_log            // Historial sincronización con WooCommerce
└─ keyPath: id (autoincrement)

productos_cache     // Caché local de productos
├─ keyPath: id
└─ índices: sku, codigo_barras

currency_rates      // Histórico tasas de cambio
├─ keyPath: id (autoincrement)
└─ índices: date
```

**Acceso:**
```javascript
import * as db from './utils/db';

// Guardar venta
await db.saveVenta({ ...ventaData });

// Obtener todas
const ventas = await db.getAllVentas();

// Filtrar por fecha
const rango = await db.getVentasByDateRange(desde, hasta);
```

### Sincronización WooCommerce

**Flujo:**
1. Venta completada en POS
2. Intenta crear Order en WooCommerce (`POST /orders`)
3. Si error → guarda en `pendingOrders` (localStorage)
4. Al reconectar → reintenta automáticamente
5. Actualiza stock en WooCommerce (`PUT /products/{id}`)

**Status:**
- `syncStore.getPendingOrders()` — lista órdenes por sincronizar
- `syncStore.clearPending(orderId)` — marca como sincronizada

---

## Impresión

**Archivo:** `src/utils/print.js`

### Comprobante (Vale Térmico)

Genera HTML optimizado para impresora 80mm:
```javascript
import { printReceipt } from './utils/print';
printReceipt(venta);
```

**Contenido:**
- Nombre negocio
- Fecha/hora
- Número ticket (V-00001)
- Dependienta
- Tabla productos (nombre, qty, precio P.U., total) — **DUAL MONEDA**
- Subtotal, descuento, **TOTAL en CUP (10.00) + USD (16,67)**
- Método pago
- Pie personalizado

### Etiquetas Producto

```javascript
import { printProductLabel } from './utils/print';
printProductLabel(product);  // 62mm × 29mm
```

**Contenido:**
- Nombre tienda
- Nombre producto
- SKU
- Precio **DUAL MONEDA**
- Código barras visual (simple)

---

## Descuentos

**Dos tipos:**

1. **Por item:** click en item → input % → aplica a ese producto solo
2. **Descuento total:** botón "Añadir descuento total" → % sobre subtotal

**Cálculo:**
```
subtotal = Σ(qty × precio_unitario × (1 - descto_item%))
total = subtotal - (subtotal × descto_total%)
```

**Storage:** `cartStore` (volátil, se limpia tras venta)

---

## Inventario & Stock

### Sincronización Inicial

Settings → Sincronizar con WooCommerce
- Carga todos los productos
- Almacena en `productos_cache` (IndexedDB)
- Muestra stock en tiempo real

### Rebaja Post-Venta

Después de imprimir vale:
1. Descuenta stock en `productos_cache`
2. Si online → `PUT /products/{id}` en WooCommerce
3. Si offline → enqueue para sync posterior

**Alertas:**
- Stock bajo (≤ umbral configurado, default 5)
- Sin stock → no permite agregar al carrito

---

## Reportes & Análisis

**Páginas:**
- **Dashboard:** KPIs hoy/mes, top 5 productos, alertas stock
- **Reports:** Diarios/semanales/mensuales/anuales con gráficos
- **SalesHistory:** Tabla filtrable, desglose por item
- **Calendar:** Vista mes con intensidad de ventas
- **Exports:** Descarga Excel/PDF por rango

---

## Configuración (Settings)

### WooCommerce
- URL tienda
- Consumer Key
- Consumer Secret
- Botón test conexión

### Sistema
- Nombre negocio
- Moneda (historicidad, aún usa EUR default)
- Umbral stock bajo
- Copias comprobante (1-3)
- Pie comprobante personalizado

### **Conversión de Moneda (NUEVO)**
- Moneda primaria: CUP (deshabilitada, siempre)
- Moneda secundaria: USD (deshabilitada, siempre)
- Factor 1 USD = X CUP (editable)
- Botón sincronizar El Toque
- Timestamp último sync

### Impresora
- Zebra (placeholder, Fase 3 Electron)

### Copia Seguridad
- Descarga JSON de todos datos

---

## Gestión de Usuarios (Admin)

**Staff.jsx** (solo administrador)
- Ver lista empleados (activos/inactivos)
- Crear nuevo usuario
- Editar datos (nombre, rol, email, teléfono)
- Activar/desactivar

**Roles:**
- `administrador` — acceso total, Settings + Staff
- `dependienta` — solo POS + búsqueda

**Storage:** localStorage (`tpv_users`)

---

## Componentes Reutilizables

### UI (src/components/ui/)
- **Button** — primary/secondary/destructive/ghost, tamaños sm/md/lg
- **Input** — text/password/number/date, icono izq, focus border
- **Modal** — overlay blur, clickeable close, tamaño configurable
- **Badge** — 8 tipos (activo/inactivo/bajo/sinstock/tarjeta/efectivo/bizum/neutral)
- **Spinner** — loading animation
- **Toast** — notificación bottom-right, auto-dismiss 3.5s
- **OfflineBanner** — aviso desconexión

### Layout
- **Sidebar** — nav vertical full/compact, logo Mango Habana, user footer, logout
- **AppLayout** — wrapper con sidebar + main

---

## Offline-First

**Funciona sin conexión:**
✅ Búsqueda de productos (usa caché local)  
✅ POS completo (agregar carrito, pago, impresión)  
✅ Historial ventas  
✅ Reportes (datos caché)  

**Sincroniza cuando hay conexión:**
- Órdenes pendientes → WooCommerce
- Stock actualizado
- Productos nuevos/modificados caché

---

## Flujo Típico: Día de Ventas

```
MAÑANA:
┌─ Admin inicia: Login (admin)
├─ Settings → Sincronizar con WooCommerce (carga productos)
├─ Settings → Sincronizar El Toque (actualiza tasas CUP/USD)
└─ Cierra Settings

DURANTE DÍA:
┌─ Dependiente 1 cambia a: Maria (dropdown POS)
├─ Escanea/busca productos
├─ Agrega carrito
├─ Aplica descuentos si necesario
├─ Pago (tarjeta/efectivo)
├─ Imprime vale
├─ Sistema guarda venta + intenta sync WooCommerce
└─ Carrito limpia, ready siguiente cliente

CAMBIO DEPENDIENTE:
└─ Otro usuario selecciona su nombre dropdown POS
  (sin logout, cada venta registra su usuario)

NOCHE:
┌─ Dashboard → ver resumen día
├─ Reports → análisis detallado
├─ Exports → descargar Excel ventas
└─ Admin logout
```

---

## Archivos Críticos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/POS.jsx` | Flujo venta, búsqueda, carrito, checkout |
| `src/store/cartStore.js` | Estado carrito (items, descuentos, totales) |
| `src/store/salesStore.js` | Persistencia ventas + IndexedDB |
| `src/api/woocommerceClient.js` | Cliente HTTP WooCommerce |
| `src/api/elTouqueClient.js` | Tasas cambio USD/CUP |
| `src/utils/currency-converter.js` | Lógica conversión, factor config |
| `src/utils/print.js` | HTML vales + etiquetas |
| `src/utils/db.js` | IndexedDB wrapper |
| `src/utils/format.js` | Formateo moneda, fechas |
| `src/pages/Settings.jsx` | Configuración WooCommerce + Moneda + Sistema |

---

## CSV Importación Productos

**Archivo:** `productos_test.csv` (carpeta raíz)

**Columnas obligatorias (WooCommerce):**
- SKU
- Nombre
- Precio regular
- Stock (cantidad)
- Categoría

**Pasos importación:**
1. WooCommerce → Tools → Import
2. Selecciona `productos_test.csv`
3. Mapea columnas automáticamente
4. Ejecuta import
5. TPV → Settings → Sincronizar WooCommerce (carga en caché local)
6. POS → Búsqueda debería ver productos nuevos

---

## Troubleshooting

### POS no carga productos
- ¿WooCommerce conectado? Settings → test conexión
- ¿Productos en caché? DevTools → IndexedDB → productos_cache
- Fallback: offline usa productos_cache (búsqueda local)

### Vale no imprime
- ¿Impresora detectada? Navegador → print dialog
- HTML correcto? DevTools → console (sin errores)
- Moneda correcta? formatDualCurrency() debe mostrar CUP + USD

### Stock no se actualiza en WooCommerce
- ¿Online? Check DevTools → Network
- ¿Credenciales válidas? Settings → test WooCommerce
- Offline: enqueue `pendingOrders` → sync cuando reconecte

### Factor de cambio no se aplica
- ¿Guardó en Settings? localStorage debe tener `tpv_currency_config`
- ¿Se recargó página? Cambios necesitan refresh
- Verificar: DevTools → Console → `getCurrencyConfig()`

---

## Próximas Fases

### Fase 3: Electron + SQLite
- Migrar IndexedDB → SQLite
- Impresoras Zebra nativas
- Compilar ejecutables Windows/macOS
- Sistema archivos (importación/exportación)

### Mejoras Futuras
- Devoluciones/cambios
- Promociones automáticas
- Multi-tienda
- Estadísticas avanzadas (cohort analysis, etc)
- App mobile (React Native)

---

## Notas de Desarrollo

- **Moneda:** Frontend calcula conversiones, no delega a El Toque
- **Offline:** IndexedDB es la fuente de verdad local
- **Sincronización:** Cada venta intenta sync automático
- **Usuarios:** Sin cifrado de password (Fase 3: mejorar seguridad)
- **Impresión:** Print HTML → navegador browser native

---

## Contacto

Preguntas sobre estructura o features: revisar archivos críticos en tabla arriba.  
Reportar bugs: abrir issue en repositorio.
