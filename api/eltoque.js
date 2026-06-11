/**
 * api/eltoque.js — Función serverless (Vercel) que obtiene las tasas de El Toque.
 *
 * El Toque no envía cabeceras CORS, así que el navegador no puede llamarlo
 * directamente en producción. Esta función lo hace desde el servidor (sin CORS)
 * y devuelve el JSON tal cual a la app.
 *
 * Recomendado: define la variable de entorno TOQUE_TOKEN en Vercel
 * (Settings → Environment Variables). Si no, usa el token incluido por defecto.
 */
const DEFAULT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3OTIwODIzNCwianRpIjoiZWEwMzA1ZDQtMjk2OC00YWVmLWE0MjctNDA5MWNlMzc0Njk5IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjZhMDQ4ODdiYzE3NDQ0ZmY0MTZjYTFlMyIsIm5iZiI6MTc3OTIwODIzNCwiZXhwIjoxODEwNzQ0MjM0fQ.IIm1Ej_3oLmvRhdskOLlYYeSbC7nfqUzMUcKUEFNgUQ';

export default async function handler(req, res) {
  try {
    const token = process.env.TOQUE_TOKEN || DEFAULT_TOKEN;
    const r = await fetch('https://tasas.eltoque.com/v1/trmi', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `El Toque HTTP ${r.status}` });
      return;
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
