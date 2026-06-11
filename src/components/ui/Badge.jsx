/**
 * Badge.jsx — Componente de etiqueta/badge.
 * Usa las clases .badge y variantes definidas en index.css.
 */

export function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`badge ${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}
