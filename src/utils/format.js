/**
 * format.js — Utilidades de formateo de fechas, moneda y números.
 */
import {
  formatDualCurrency as fmtDual,
  convertCurrency,
  getCurrencyConfig,
} from './currency-converter';

/**
 * Formatea un número como moneda (CUP por defecto, soporta USD/EUR).
 * Si moneda no especificada, usa config local.
 */
export function formatCurrency(amount, currency) {
  const config = getCurrencyConfig();
  const moneda = currency || config.primary || 'CUP';

  if (moneda === 'CUP') {
    // Formato CUP: $1.234,56 con separador miles
    const formatted = (amount || 0).toFixed(2);
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `$${parts[0]}.${parts[1]}`;
  }

  // USD/EUR usan Intl
  const locale = moneda === 'EUR' ? 'es-ES' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Formatea cantidad dual CUP y USD
 * Ejemplo: "6.000,00 CUP (10,00 USD)"
 */
export function formatDualCurrency(amount, showBoth = true) {
  return fmtDual(amount, showBoth);
}

/**
 * Los precios del TPV se manejan en USD (moneda principal). Esta función
 * convierte un importe en USD a su equivalente en CUP y lo formatea.
 * Ejemplo: formatCup(55) → "33.000 CUP" (con factor 600).
 */
export function formatCup(usdAmount) {
  const rate = getCurrencyConfig().exchange_rate || 600;
  const cup = Math.round((usdAmount || 0) * rate);
  return `${cup.toLocaleString('es-ES')} CUP`;
}

/**
 * Convierte un importe en USD a su equivalente en EUR y lo formatea.
 * EUR = USD × (tasa_USD / tasa_EUR), ambas en CUP. Ej: "€48.50".
 */
export function formatEur(usdAmount) {
  const config = getCurrencyConfig();
  const usdRate = config.exchange_rate || 600;
  const eurRate = config.eur_rate || usdRate;
  const eur = (usdAmount || 0) * (usdRate / eurRate);
  return `€${eur.toFixed(2)}`;
}

/** Equivalente numérico USD→EUR (sin formato), por si se necesita en cálculos. */
export function usdToEur(usdAmount) {
  const config = getCurrencyConfig();
  const usdRate = config.exchange_rate || 600;
  const eurRate = config.eur_rate || usdRate;
  return (usdAmount || 0) * (usdRate / eurRate);
}

/**
 * Convierte cantidad entre monedas
 */
export function convertAmount(amount, from = 'CUP', to = 'USD') {
  return convertCurrency(amount, from, to);
}

/**
 * Formatea una fecha a string legible en español.
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const defaults = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };
  return date.toLocaleDateString('es-ES', defaults);
}

/**
 * Formatea fecha y hora completa.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea solo la hora.
 */
export function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trunca un texto a N caracteres.
 */
export function truncate(text, maxLength = 30) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

/**
 * Formatea número con separadores de miles.
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('es-ES').format(num || 0);
}
