/**
 * woocommerceClient.js — ÚNICO punto de conexión con WooCommerce REST API.
 * Lee siempre la configuración desde localStorage para que cambiar de
 * entorno de simulación a producción no requiera modificar código fuente.
 */

const DEFAULT_CONFIG = {
  url: '',
  consumerKey: '',
  consumerSecret: '',
};

/**
 * Obtiene la configuración de conexión guardada en el sistema.
 * @returns {{ url: string, consumerKey: string, consumerSecret: string }}
 */
/**
 * Normaliza un objeto de configuración aceptando tanto los nombres
 * cortos que usa la UI de Settings ({ url, key, secret }) como los
 * nombres largos ({ url, consumerKey, consumerSecret }). Devuelve
 * siempre el formato canónico que usa el resto del cliente.
 */
function normalizeConfig(raw = {}) {
  return {
    url: raw.url || '',
    consumerKey: raw.consumerKey || raw.key || '',
    consumerSecret: raw.consumerSecret || raw.secret || '',
  };
}

function getConfig() {
  try {
    const stored = localStorage.getItem('tpv_woo_config');
    if (stored) return normalizeConfig(JSON.parse(stored));
  } catch {
    // Si hay error de parseo, usar defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Guarda la configuración de conexión.
 * @param {{ url: string, consumerKey: string, consumerSecret: string }} config
 */
export function saveWooConfig(config) {
  localStorage.setItem('tpv_woo_config', JSON.stringify(config));
}

/**
 * Construye los headers de autenticación Basic para WooCommerce.
 * WooCommerce REST API acepta Basic Auth con Consumer Key y Secret.
 */
function buildAuthHeaders(consumerKey, consumerSecret) {
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Realiza una petición a la WooCommerce REST API.
 * @param {string} endpoint - Ruta relativa, ej: '/products'
 * @param {object} options - Opciones de fetch (method, body, etc.)
 * @returns {Promise<any>}
 */
export async function wooFetch(endpoint, options = {}) {
  const { url, consumerKey, consumerSecret } = getConfig();

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error('WooCommerce no configurado. Ve a Configuración e introduce las credenciales.');
  }

  const baseUrl = url.replace(/\/$/, '');
  const apiUrl = `${baseUrl}/wp-json/wc/v3${endpoint}`;

  const response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...buildAuthHeaders(consumerKey, consumerSecret),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `Error HTTP ${response.status}` }));
    throw new Error(error.message || `Error HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Prueba la conexión con las credenciales actuales (o las proporcionadas).
 * @param {{ url: string, consumerKey: string, consumerSecret: string }} [testConfig]
 * @returns {Promise<boolean>}
 */
export async function testWooConnection(testConfig) {
  if (testConfig) {
    const { url, consumerKey, consumerSecret } = normalizeConfig(testConfig);
    const baseUrl = url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wc/v3/system_status`;
    const response = await fetch(apiUrl, {
      headers: buildAuthHeaders(consumerKey, consumerSecret),
    });
    if (!response.ok) throw new Error(`Error de conexión: ${response.status}`);
    return true;
  }
  await wooFetch('/system_status');
  return true;
}

/**
 * Construye query string paginada para la API de WooCommerce.
 * @param {object} params
 * @returns {string}
 */
export function buildQueryString(params = {}) {
  const defaults = { per_page: 100 };
  const merged = { ...defaults, ...params };
  return '?' + new URLSearchParams(merged).toString();
}
