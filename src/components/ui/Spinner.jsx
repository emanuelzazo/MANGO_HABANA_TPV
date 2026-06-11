/**
 * Spinner.jsx — Indicador de carga circular.
 * Usa las clases .spinner, .sm, .md, .lg y .white de index.css.
 */

export function Spinner({ size = 'md', white = false }) {
  const classes = ['spinner', size, white ? 'white' : '']
    .filter(Boolean)
    .join(' ');

  return <div className={classes} />;
}

export function PageLoader({ label = 'Cargando…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: '100%',
        minHeight: 220,
        color: 'var(--text-muted)',
      }}
    >
      <Spinner size="lg" />
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </div>
  );
}
