// El Toque API client - Tasas de cambio USD/CUP
// Endpoint real: https://tasas.eltoque.com/v1/trmi
// Respuesta: { tasas: { USD: 615, ... }, date, hour, ... }

import { getCurrencyConfig } from '../utils/currency-converter';

const TOQUE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3OTIwODIzNCwianRpIjoiZWEwMzA1ZDQtMjk2OC00YWVmLWE0MjctNDA5MWNlMzc0Njk5IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMDQ4ODdiYzE3NDQ0ZmY0MTZjYTFlMyIsIm5iZiI6MTc3OTIwODIzNCwiZXhwIjoxODEwNzQ0MjM0fQ.IIm1Ej_3oLmvRhdskOLlYYeSbC7nfqUzMUcKUEFNgUQ';

// El Toque no envía CORS. Según el entorno se obtiene de forma distinta:
//  • Electron  → proceso principal vía IPC (sin restricción CORS).
//  • Web dev   → proxy de Vite /eltoque-api (ver vite.config.js).
//  • Web prod  → función serverless /api/eltoque (Vercel, ver api/eltoque.js).
async function fetchToqueData() {
  if (typeof window !== 'undefined' && window.electronAPI?.eltoqueFetch) {
    const data = await window.electronAPI.eltoqueFetch(TOQUE_TOKEN);
    if (!data) throw new Error('El Toque sin respuesta (Electron)');
    return data;
  }
  if (import.meta.env.DEV) {
    const res = await fetch('/eltoque-api/v1/trmi', {
      headers: { Authorization: `Bearer ${TOQUE_TOKEN}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  // Producción web: la función serverless añade el token y resuelve el CORS.
  const res = await fetch('/api/eltoque');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Obtiene tasas actuales de El Toque
 * Respuesta esperada: { tasas: { USD: 615, TRX: 220, MLC: 475, ... }, date, hour, minutes, seconds }
 */
export async function fetchExchangeRates() {
  try {
    const data = await fetchToqueData();

    // La respuesta real es: { tasas: { USD: 615, EUR: 670, ... }, date: "2026-06-05", ... }
    const usdRate = data?.tasas?.USD || data?.usd || 600;
    const eurRate = data?.tasas?.ECU || data?.tasas?.EUR || data?.eur || 0;

    return {
      success: true,
      rates: {
        usd: usdRate,
        eur: eurRate,
        mlc: data?.tasas?.MLC || 475,
        trx: data?.tasas?.TRX || 220,
      },
      raw: data,
      timestamp: Date.now(),
      source: 'eltoque',
    };
  } catch (error) {
    console.warn('El Toque API error:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: true,
    };
  }
}

/**
 * Test de conexión con El Toque
 */
export async function testElTouqueConnection() {
  try {
    const data = await fetchToqueData();
    const usdRate = data?.tasas?.USD || null;
    return { ok: true, usdRate, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Obtener tasas con retry y fallback al valor guardado en config
 */
export async function getExchangeRatesWithFallback(maxRetries = 2) {
  const config = getCurrencyConfig();

  for (let i = 0; i < maxRetries; i++) {
    const result = await fetchExchangeRates();
    if (result.success) return result;
    if (i < maxRetries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }

  // Fallback: usar factores guardados en config
  return {
    success: false,
    rates: {
      usd: config.usd_rate_toque || config.exchange_rate || 600,
      eur: config.eur_rate_toque || config.eur_rate || 0,
    },
    fallback: true,
    timestamp: Date.now(),
    source: 'fallback',
  };
}
