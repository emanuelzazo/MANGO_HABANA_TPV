/**
 * barcode.js — Utilidades para códigos de barras EAN-13.
 */

/**
 * Valida si una cadena es un EAN-13 válido (13 dígitos con dígito de control correcto).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === check;
}

/**
 * Valida si una cadena puede ser un código de barras (EAN-13, EAN-8 o UPC-A).
 * @param {string} code
 * @returns {boolean}
 */
export function looksLikeBarcode(code) {
  return /^\d{8,14}$/.test(code.trim());
}

/**
 * Genera el SVG de un código de barras EAN-13 sin dependencias externas.
 * Implementación básica para etiquetas de producto.
 * @param {string} code - Código de 13 dígitos
 * @returns {string} SVG string
 */
export function generateBarcodeSVG(code) {
  if (!code || code.length !== 13) {
    return '<svg width="200" height="60"><text x="10" y="30" font-size="12" fill="#999">Código inválido</text></svg>';
  }

  // Patrón de barras EAN-13 (simplificado para visualización)
  const GUARD = [1, 0, 1];
  const CENTER = [0, 1, 0, 1, 0];
  const L_CODES = [
    [0,0,0,1,1,0,1], [0,0,1,1,0,0,1], [0,0,1,0,0,1,1], [0,1,1,1,1,0,1],
    [0,1,0,0,0,1,1], [0,1,1,0,0,0,1], [0,1,0,1,1,1,1], [0,1,1,1,0,1,1],
    [0,1,1,0,1,1,1], [0,0,0,1,0,1,1],
  ];
  const G_CODES = L_CODES.map(c => [...c].reverse());
  const R_CODES = L_CODES.map(c => c.map(b => b ^ 1));

  const FIRST_DIGIT_PARITY = [
    [0,0,0,0,0,0], [0,0,1,0,1,1], [0,0,1,1,0,1], [0,0,1,1,1,0],
    [0,1,0,0,1,1], [0,1,1,0,0,1], [0,1,1,1,0,0], [0,1,0,1,0,1],
    [0,1,0,1,1,0], [0,1,1,0,1,0],
  ];

  const digits = code.split('').map(Number);
  const parity = FIRST_DIGIT_PARITY[digits[0]];
  let bars = [];

  bars.push(...GUARD);
  for (let i = 0; i < 6; i++) {
    const d = digits[i + 1];
    bars.push(...(parity[i] === 0 ? L_CODES[d] : G_CODES[d]));
  }
  bars.push(...CENTER);
  for (let i = 0; i < 6; i++) {
    bars.push(...R_CODES[digits[i + 7]]);
  }
  bars.push(...GUARD);

  const barWidth = 2;
  const barHeight = 50;
  const svgWidth = bars.length * barWidth + 20;

  let rects = '';
  bars.forEach((bar, i) => {
    if (bar === 1) {
      rects += `<rect x="${10 + i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
    }
  });

  return `<svg width="${svgWidth}" height="${barHeight + 16}" xmlns="http://www.w3.org/2000/svg">
    ${rects}
    <text x="${svgWidth / 2}" y="${barHeight + 12}" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${code}</text>
  </svg>`;
}

/**
 * Formatea un código para mostrarlo como EAN-13 con separadores visuales.
 * @param {string} code
 * @returns {string}
 */
export function formatEAN13(code) {
  if (!code || code.length !== 13) return code || '';
  return `${code[0]} ${code.slice(1, 7)} ${code.slice(7)}`;
}
