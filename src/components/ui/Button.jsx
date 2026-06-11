/**
 * Button.jsx — Botón reutilizable.
 * Usa las clases .btn, .btn-{variant}, .btn-{size}, .btn-full de index.css.
 */

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  style = {},
  fullWidth = false,
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      style={style}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            flexShrink: 0,
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : Icon ? (
        <Icon size={15} style={{ flexShrink: 0 }} />
      ) : null}
      {children}
    </button>
  );
}
