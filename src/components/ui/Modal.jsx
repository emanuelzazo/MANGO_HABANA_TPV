/**
 * Modal.jsx — Diálogo modal reutilizable.
 * Usa las clases .modal-overlay, .modal-box, .modal-header,
 * .modal-title y .modal-close de index.css.
 */
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = 480,
  size,
  hideCloseButton = false,
}) {
  // Resolver ancho según size o prop width
  let resolvedWidth = width;
  if (size === 'sm') resolvedWidth = 420;
  else if (size === 'lg') resolvedWidth = 640;
  else if (size === 'md') resolvedWidth = 480;

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Solo cerrar si el clic EMPIEZA y TERMINA en el overlay. Así, al seleccionar
  // texto dentro del modal y soltar el ratón fuera, el modal NO se cierra.
  const downOnOverlay = useRef(false);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { downOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => {
        if (downOnOverlay.current && e.target === e.currentTarget) onClose();
        downOnOverlay.current = false;
      }}
    >
      <div
        className="modal-box"
        style={{ width: resolvedWidth }}
      >
        {(title || !hideCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {!hideCloseButton && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
