/**
 * Input.jsx — Input reutilizable con icono opcional.
 * Usa las clases .mh-input-wrap, .mh-input-icon, .mh-input y .with-icon de index.css.
 * Soporta forwardRef para referencias externas.
 */
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    type = 'text',
    placeholder,
    value,
    onChange,
    icon: Icon,
    style = {},
    autoFocus,
    id,
    name,
    disabled = false,
    className = '',
    label,
    error,
    wrapperClassName = '',
    ...rest
  },
  ref
) {
  return (
    <div className={`mh-input-wrap ${wrapperClassName}`.trim()} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
      )}
      <div className="mh-input-wrap" style={{ position: 'relative' }}>
        {Icon && (
          <div className="mh-input-icon">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          disabled={disabled}
          style={style}
          className={`mh-input ${Icon ? 'with-icon' : ''} ${className}`.trim()}
          {...rest}
        />
      </div>
      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
});
