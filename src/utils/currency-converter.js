// Currency converter - Soporte CUP, USD, EUR con persistencia
import * as db from './db';
import { getExchangeRatesWithFallback } from '../api/elTouqueClient';

const DEFAULT_CONFIG = {
  primary: 'CUP',
  secondary: 'USD',
  exchange_rate: 600,   // tasa EFECTIVA USD = usd_rate_toque + usd_margin (CUP por 1 USD)
  eur_rate: 650,        // tasa EFECTIVA EUR = eur_rate_toque + eur_margin (CUP por 1 EUR)
  usd_rate_toque: 600,  // tasa cruda informada por El Toque (USD)
  eur_rate_toque: 650,  // tasa cruda informada por El Toque (EUR)
  usd_margin: 0,        // CUP a sumar sobre la tasa cruda USD (+10/+15/+20…)
  eur_margin: 0,        // CUP a sumar sobre la tasa cruda EUR (independiente del USD)
  last_sync: null,
  source: 'manual',
};

// Obtener config actual de localStorage (con migración del margen único → separado)
export function getCurrencyConfig() {
  try {
    const stored = localStorage.getItem('tpv_currency_config');
    if (!stored) return { ...DEFAULT_CONFIG };
    const c = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    // Migración: antes había un único `margin` → ahora usd_margin y eur_margin.
    if (c.margin !== undefined) {
      if (c.usd_margin === undefined || c.usd_margin === 0) c.usd_margin = c.margin;
      if (c.eur_margin === undefined || c.eur_margin === 0) c.eur_margin = c.margin;
      delete c.margin;
    }
    return c;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Guardar config en localStorage
export function setCurrencyConfig(config) {
  localStorage.setItem('tpv_currency_config', JSON.stringify(config));
}

// Tasa EUR efectiva (CUP por 1 EUR).
export function getEurRate() {
  const c = getCurrencyConfig();
  return c.eur_rate || (c.eur_rate_toque || 0) + (c.margin || 0) || 650;
}

// Recalcula las tasas efectivas (USD y EUR) sumando cada margen a su tasa cruda.
function applyMargin(config) {
  if (config.usd_rate_toque) config.exchange_rate = config.usd_rate_toque + (config.usd_margin || 0);
  if (config.eur_rate_toque) config.eur_rate = config.eur_rate_toque + (config.eur_margin || 0);
  return config;
}

// Fija el margen USD (+CUP) y recalcula la tasa USD efectiva.
export function setUsdMargin(margin) {
  const config = getCurrencyConfig();
  config.usd_margin = Math.max(0, parseFloat(margin) || 0);
  applyMargin(config);
  setCurrencyConfig(config);
  return config;
}

// Fija el margen EUR (+CUP) y recalcula la tasa EUR efectiva.
export function setEurMargin(margin) {
  const config = getCurrencyConfig();
  config.eur_margin = Math.max(0, parseFloat(margin) || 0);
  applyMargin(config);
  setCurrencyConfig(config);
  return config;
}

// Compatibilidad: aplica el mismo margen a USD y EUR.
export function setRateMargin(margin) {
  const m = Math.max(0, parseFloat(margin) || 0);
  const config = getCurrencyConfig();
  config.usd_margin = m;
  config.eur_margin = m;
  applyMargin(config);
  setCurrencyConfig(config);
  return config;
}

// Actualizar factor USD manualmente (la cruda se deriva quitando el margen).
export function setExchangeRate(rate) {
  const config = getCurrencyConfig();
  config.exchange_rate = parseFloat(rate) || 600;
  config.usd_rate_toque = config.exchange_rate - (config.usd_margin || 0);
  config.last_sync = Date.now();
  config.source = 'manual';
  setCurrencyConfig(config);
  return config;
}

// Actualizar factor EUR manualmente (la cruda se deriva quitando el margen).
export function setEurRateManual(rate) {
  const config = getCurrencyConfig();
  config.eur_rate = parseFloat(rate) || 0;
  config.eur_rate_toque = config.eur_rate - (config.eur_margin || 0);
  config.last_sync = Date.now();
  config.source = 'manual';
  setCurrencyConfig(config);
  return config;
}

// Sincronizar tasas (USD y EUR) con El Toque y aplicar el margen.
export async function syncRatesFromElToque() {
  const result = await getExchangeRatesWithFallback();
  const config = getCurrencyConfig();

  if (result.rates?.usd) config.usd_rate_toque = result.rates.usd;
  if (result.rates?.eur) config.eur_rate_toque = result.rates.eur;
  applyMargin(config);
  config.last_sync = Date.now();
  config.source = result.source;

  setCurrencyConfig(config);

  // Guardar en IndexedDB para historial (tasas efectivas del día).
  try {
    await db.addCurrencyRate({
      date: new Date().toISOString(),
      usd_rate: config.exchange_rate,
      eur_rate: config.eur_rate,
      usd_toque: config.usd_rate_toque,
      eur_toque: config.eur_rate_toque,
      usd_margin: config.usd_margin,
      eur_margin: config.eur_margin,
      source: result.source,
    });
  } catch (e) {
    console.warn('DB error storing rate:', e);
  }

  return { success: result.success, config };
}

// Registra la tasa efectiva del día en el histórico si aún no hay entrada de hoy.
// Así el reporte de Tasas tiene un punto por día aunque no se sincronice.
export async function ensureTodayRate() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const recientes = await db.getCurrencyRates(8);
    if (recientes.some(r => (r.date || '').slice(0, 10) === today)) return;
    const config = getCurrencyConfig();
    await db.addCurrencyRate({
      date: new Date().toISOString(),
      usd_rate: config.exchange_rate,
      eur_rate: config.eur_rate,
      usd_toque: config.usd_rate_toque,
      eur_toque: config.eur_rate_toque,
      margin: config.margin,
      source: config.source || 'auto',
    });
  } catch {
    /* sin DB → ignorar */
  }
}

// Convertir cantidad entre monedas
// amount: número
// from: 'CUP' | 'USD' | 'EUR'
// to: 'CUP' | 'USD' | 'EUR'
export function convertCurrency(amount, from = 'CUP', to = 'USD') {
  if (from === to) return amount;

  const config = getCurrencyConfig();
  const rate = config.exchange_rate;              // CUP por 1 USD
  const eur = config.eur_rate || rate;            // CUP por 1 EUR

  if (from === 'CUP' && to === 'USD') return amount / rate;
  if (from === 'USD' && to === 'CUP') return amount * rate;
  if (from === 'EUR' && to === 'CUP') return amount * eur;
  if (from === 'CUP' && to === 'EUR') return amount / eur;
  if (from === 'EUR' && to === 'USD') return (amount * eur) / rate;
  if (from === 'USD' && to === 'EUR') return (amount * rate) / eur;

  return amount;
}

// Formatear cantidad con símbolo y decimales
// amount: número
// currency: 'CUP' | 'USD' | 'EUR'
// options: { decimals, symbol, separator }
export function formatCurrency(amount, currency = 'CUP', options = {}) {
  const {
    decimals = 2,
    symbol = true,
    separator = true,
  } = options;

  const symbols = { CUP: '$', USD: '$', EUR: '€' };

  let formatted = amount.toFixed(decimals);

  if (separator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency === 'EUR' ? '.' : ',');
    formatted = parts.join(currency === 'EUR' ? ',' : '.');
  }

  return symbol ? `${symbols[currency]}${formatted}` : formatted;
}

// Formatear cantidad dual (CUP y USD)
// amount: número (en CUP, la moneda primaria)
// showBoth: si true, muestra "X CUP (Y USD)", si false solo CUP
export function formatDualCurrency(amount, showBoth = true) {
  const cupFormatted = formatCurrency(amount, 'CUP', { decimals: 2 });
  if (!showBoth) return cupFormatted;

  const usdAmount = convertCurrency(amount, 'CUP', 'USD');
  const usdFormatted = formatCurrency(usdAmount, 'USD', { decimals: 2 });

  return `${cupFormatted} (${usdFormatted})`;
}

// Obtener información de última sincronización
export function getLastSyncInfo() {
  const config = getCurrencyConfig();
  if (!config.last_sync) return null;

  const date = new Date(config.last_sync);
  const minutes = Math.floor((Date.now() - config.last_sync) / 60000);

  return {
    timestamp: config.last_sync,
    date: date.toLocaleString('es-CU'),
    minutesAgo: minutes,
    source: config.source,
    rate: config.exchange_rate,
  };
}
