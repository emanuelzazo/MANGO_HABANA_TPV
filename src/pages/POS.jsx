import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Trash2, Plus, Minus, ShoppingCart, CreditCard, Banknote, Tag, X, Printer, Users, CheckCircle2, Scan, AlertTriangle, ArrowRightLeft, Layers } from 'lucide-react';
import { normalizeProduct, fetchAllProducts } from '../api/products';
import { createOrder } from '../api/orders';
import { useCartStore } from '../store/cartStore';
import { useSalesStore } from '../store/salesStore';
import { useAuthStore } from '../store/authStore';
import { addProductToCart } from '../utils/addProductToCart';
import { useToastStore } from '../store/toastStore';
import { useSyncStore } from '../store/syncStore';
import { getCachedProducts, updateCachedProductStock, cacheProducts } from '../utils/db';
import { resolveProductByCode } from '../utils/resolveProduct';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatCup, formatEur } from '../utils/format';
import { printReceipt } from '../utils/print';
import { looksLikeBarcode } from '../utils/barcode';
import { getCurrencyConfig } from '../utils/currency-converter';

// Equivalentes en CUP y EUR (debajo del importe USD principal).
function MoneySub({ usd, size = 11, align = 'left' }) {
  return (
    <div style={{ fontSize: size, color: 'var(--text-muted)', lineHeight: 1.35, textAlign: align }}>
      <div>{formatCup(usd)}</div>
      <div>{formatEur(usd)}</div>
    </div>
  );
}

// ── Componente búsqueda de productos ──────────────────────────────
function SearchPanel({ onAddProduct }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState('Todas');
  const [categories, setCategories] = useState(['Todas']);
  const [allProducts, setAllProducts] = useState([]);
  const [showGrid, setShowGrid] = useState(false);
  const inputRef = useRef(null);

  // Carga cache-first: muestra la caché al instante (UX rápida) y refresca
  // desde WooCommerce en segundo plano, re-poblando la caché.
  useEffect(() => {
    let alive = true;
    const apply = (prods) => {
      if (!alive || !prods.length) return;
      setAllProducts(prods);
      setShowGrid(true);
      setCategories(['Todas', ...new Set(prods.map(p => p.categoria).filter(Boolean))]);
    };
    getCachedProducts().then(apply).catch(() => {});
    fetchAllProducts({ per_page: 100 })
      .then(raw => { const prods = raw.map(normalizeProduct); apply(prods); if (prods.length) cacheProducts(prods).catch(() => {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    const keepFocus = (e) => {
      const isInteractive = ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'].includes(e.target.tagName);
      const inModal = e.target.closest('[data-modal]');
      if (isInteractive || inModal) return;
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    document.addEventListener('click', keepFocus);
    return () => document.removeEventListener('click', keepFocus);
  }, []);

  // Filtrado local instantáneo por nombre, SKU o código de barras.
  const q = query.trim().toLowerCase();
  const filtered = allProducts.filter(p => {
    const matchCat = category === 'Todas' || p.categoria === category;
    if (!q) return matchCat;
    return matchCat && (
      p.nombre?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.codigo_barras?.toLowerCase().includes(q)
    );
  });

  const handleChange = (e) => setQuery(e.target.value);

  // Enter o escaneo: añade el producto si hay coincidencia exacta o única.
  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    const v = query.trim();
    if (!v) return;
    const vl = v.toLowerCase();
    const exact = allProducts.find(p => p.sku?.toLowerCase() === vl || p.codigo_barras?.toLowerCase() === vl);
    if (exact) { onAddProduct(exact); setQuery(''); return; }
    if (filtered.length === 1) { onAddProduct(filtered[0]); setQuery(''); return; }
    if (filtered.length === 0 || looksLikeBarcode(v)) {
      setSearching(true);
      const p = await resolveProductByCode(v).catch(() => null);
      setSearching(false);
      if (p) { onAddProduct(p); setQuery(''); return; }
    }
  };

  const notFound = q.length > 0 && filtered.length === 0;
  const displayProducts = filtered;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header POS */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          Punto de Venta
        </h1>

        {/* Barra de búsqueda */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Scan size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Escanear código de barras o buscar por nombre / SKU..."
            className="scan-input"
            style={{ paddingLeft: 44, paddingRight: 16, height: 48, width: '100%' }}
            autoComplete="off"
          />
          {searching && (
            <div className="spinner sm" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
          )}
        </div>

        {/* Filtros de categoría (solo en modo grid) */}
        {showGrid && !query && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 12 }}>
            {categories.map(c => (
              <button key={c} className={`category-pill ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de productos / resultados */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
        {notFound && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>Sin resultados para "{query}"</p>
          </div>
        )}

        {displayProducts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {displayProducts.map(product => (
              <ProductCard key={product.id || product.woo_id} product={product} onAdd={() => onAddProduct(product)} />
            ))}
          </div>
        )}

        {!query && !showGrid && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <Scan size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Escanea o busca un producto</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>También puedes sincronizar el catálogo en Configuración</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de producto ──────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  const [hover, setHover] = useState(false);
  const outOfStock = product.stock !== undefined && product.stock <= 0 && product.gestionar_stock;
  const lowStock = product.stock > 0 && product.stock <= 5 && product.gestionar_stock;

  const price = product.precio_oferta || product.precio; // en USD

  return (
    <div
      className={`product-card ${outOfStock ? 'out-of-stock' : ''}`}
      style={{ borderColor: hover && !outOfStock ? 'var(--accent)' : 'var(--border)' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !outOfStock && onAdd()}
    >
      {/* Imagen placeholder */}
      <div style={{
        height: 80,
        borderRadius: 8,
        background: '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {product.imagen_url ? (
          <img src={product.imagen_url} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#E8E8E8' }} />
        )}
        {outOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--danger)' }}>
            SIN STOCK
          </div>
        )}
        {lowStock && !outOfStock && (
          <div style={{ position: 'absolute', top: 4, right: 4, background: '#FEF3C7', color: '#92400E', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
            ¡Últimas {product.stock}!
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2 }}>
          {product.nombre}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{product.categoria || product.sku}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatCurrency(price)}
          </div>
          <MoneySub usd={price} size={10} />
        </div>
        {!outOfStock && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: 'none',
              background: hover ? 'var(--accent)' : '#F3F4F6',
              color: hover ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Item del carrito ──────────────────────────────────────────────
function CartItem({ item, onUpdateQty, onRemove, onDiscount }) {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(item.descuento || 0);

  const applyDiscount = () => {
    onDiscount(item.id, parseFloat(discountValue) || 0);
    setEditingDiscount(false);
  };

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 6, background: '#F3F4F6', flexShrink: 0, overflow: 'hidden' }}>
        {item.imagen_url ? (
          <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.nombre}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(item.precio_unitario)} c/u</div>
      </div>

      {/* Controles qty */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
          style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <Minus size={11} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, width: 20, textAlign: 'center', color: 'var(--text-primary)' }}>{item.cantidad}</span>
        <button
          onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
          disabled={item.stock > 0 && item.cantidad >= item.stock}
          style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: item.stock > 0 && item.cantidad >= item.stock ? 0.4 : 1 }}>
          <Plus size={11} />
        </button>
      </div>

      {/* Descuento item */}
      {editingDiscount ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number" min="0" max="100"
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyDiscount()}
            style={{ width: 48, height: 24, padding: '0 4px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, outline: 'none' }}
            autoFocus
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>%</span>
          <button onClick={applyDiscount} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>OK</button>
        </div>
      ) : (
        <button
          onClick={() => setEditingDiscount(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: item.descuento > 0 ? 'var(--success)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Tag size={10} />
          {item.descuento > 0 ? `${item.descuento}%` : 'Dto.'}
        </button>
      )}

      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', width: 64, textAlign: 'right', flexShrink: 0 }}>
        {formatCurrency(item.subtotal)}
      </span>

      <button onClick={() => onRemove(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Panel de carrito ──────────────────────────────────────────────
function CartPanel({ onCheckout }) {
  const {
    items, updateQuantity, removeItem, setItemDiscount,
    setDescuentoTotal, descuentoTotal,
    getSubtotal, getDescuentoMonto, getTotal, getTotalItems, clearCart,
  } = useCartStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const getUsers = useAuthStore(s => s.getUsers);
  const setActiveUser = useAuthStore(s => s.setActiveUser);

  // Cambio rápido de dependienta: sin login ni contraseña, solo seleccionar.
  const handleChangeStaff = (userId) => {
    const user = getUsers().find(u => u.id === parseInt(userId));
    if (user) setActiveUser(user);
  };

  const subtotal = getSubtotal();
  const descuentoMonto = getDescuentoMonto();
  const total = getTotal();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderLeft: '1px solid var(--border)' }}>
      {/* Header carrito */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingCart size={16} />
            Carrito {getTotalItems() > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({getTotalItems()} ud.)</span>}
          </h2>
          {items.length > 0 && (
            <button onClick={clearCart} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Trash2 size={12} /> Vaciar
            </button>
          )}
        </div>

        {/* Selector dependienta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F7F7F7', borderRadius: 8, padding: '8px 12px' }}>
          <Users size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <select
            value={currentUser?.id || ''}
            onChange={e => handleChangeStaff(e.target.value)}
            style={{ flex: 1, fontSize: 13, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            {getUsers().filter(u => u.estado).map(user => (
              <option key={user.id} value={user.id}>
                {user.rol === 'administrador' ? `${user.nombre} (Admin)` : user.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '48px 0' }}>
            <ShoppingCart size={36} style={{ marginBottom: 12, opacity: 0.25 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Carrito vacío</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Escanea o busca un producto</p>
          </div>
        ) : (
          items.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQty={updateQuantity}
              onRemove={removeItem}
              onDiscount={setItemDiscount}
            />
          ))
        )}
      </div>

      {/* Totales */}
      {items.length > 0 && (
        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border)' }}>
          {/* Descuentos rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Descuento rápido</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 5, 10, 15, 20].map(d => (
                <button key={d} onClick={() => setDescuentoTotal(d, 'porcentaje')}
                  style={{
                    padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: descuentoTotal === d ? 'var(--accent)' : '#F7F7F7',
                    color: descuentoTotal === d ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid transparent', cursor: 'pointer',
                  }}
                >{d}%</button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#F7F7F7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatCurrency(subtotal)}</span>
            </div>
            {descuentoMonto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#22C55E' }}>Descuento ({descuentoTotal}%)</span>
                <span style={{ fontSize: 13, color: '#22C55E' }}>−{formatCurrency(descuentoMonto)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{formatCurrency(total)}</div>
                <MoneySub usd={total} size={11} align="right" />
              </div>
            </div>
          </div>

          {currentUser?.rol === 'visor' ? (
            <div style={{ width: '100%', padding: '14px', borderRadius: 10, background: '#F3F4F6', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              Modo solo lectura — sin permiso para cobrar
            </div>
          ) : (
            <button
              onClick={onCheckout}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <CreditCard size={18} />
              Cobrar {formatCurrency(total)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal de pago ─────────────────────────────────────────────────
// Reglas de negocio (precios en USD):
//   • Efectivo      → admite USD y CUP, sin recargo. Calcula el cambio.
//   • Transferencia → recargo configurable 0-40% (por defecto 20%).
function PaymentModal({ isOpen, onClose, onConfirm, total, descuento, confirming }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [recargoPct, setRecargoPct] = useState(0);
  const [cashCurrency, setCashCurrency] = useState('USD');
  const [cashReceived, setCashReceived] = useState('');
  // Modo desglosado (mixto)
  const [sTransfer, setSTransfer] = useState('');     // base USD por transferencia
  const [sTransferPct, setSTransferPct] = useState(20);
  const [sUsd, setSUsd] = useState('');
  const [sCup, setSCup] = useState('');
  const [sEur, setSEur] = useState('');

  const config = getCurrencyConfig();
  const rate = config.exchange_rate || 600;
  const eurRate = config.eur_rate || rate;

  // Conversión moneda ⇄ USD base
  const toCur = (usd, cur) => cur === 'CUP' ? usd * rate : cur === 'EUR' ? usd * (rate / eurRate) : usd;
  const fromCur = (amt, cur) => cur === 'CUP' ? amt / rate : cur === 'EUR' ? amt * (eurRate / rate) : amt;
  const fmtCur = (amt, cur) => cur === 'CUP'
    ? `${Math.round(amt).toLocaleString('es-ES')} CUP`
    : cur === 'EUR' ? `€${amt.toFixed(2)}` : `$${amt.toFixed(2)}`;

  const pickMethod = (key) => {
    setMetodoPago(key);
    setRecargoPct(key === 'transferencia' ? 20 : 0);
    setCashReceived(''); setCashCurrency('USD');
    setSTransfer(''); setSTransferPct(20); setSUsd(''); setSCup(''); setSEur('');
  };

  const esEfectivo = metodoPago === 'efectivo';
  const esTransfer = metodoPago === 'transferencia';
  const esMixto = metodoPago === 'mixto';

  // ── Efectivo / Transferencia simples ──
  const recargoMonto = esTransfer ? total * (recargoPct / 100) : 0;
  const totalFinal = total + recargoMonto;                       // USD
  const due = toCur(totalFinal, esEfectivo ? cashCurrency : 'USD');
  const received = parseFloat(cashReceived || 0);
  const change = esEfectivo ? received - due : 0;
  const insufficient = esEfectivo && cashReceived !== '' && received < due;

  // ── Desglosado (mixto) ──
  // La transferencia se introduce en CUP; su valor base USD se deriva con la tasa.
  const nTransfer = (parseFloat(sTransfer || 0)) / rate;   // USD base equivalente
  const nUsd = parseFloat(sUsd || 0);
  const nCup = parseFloat(sCup || 0);
  const nEur = parseFloat(sEur || 0);
  const mixRecargo = nTransfer * (sTransferPct / 100);            // USD
  const mixCubierto = nTransfer + nUsd + fromCur(nCup, 'CUP') + fromCur(nEur, 'EUR'); // USD
  const mixRestante = total - mixCubierto;                        // USD (≤0 = cubierto)
  const mixCambio = Math.max(0, mixCubierto - total);
  const mixTotalPagar = total + mixRecargo;                       // USD
  const mixIncompleto = esMixto && mixRestante > 0.005;

  // Total efectivo final mostrado (según modo)
  const granTotal = esMixto ? mixTotalPagar : totalFinal;
  const disabled = confirming || insufficient || mixIncompleto;

  const payMethods = [
    { key: 'efectivo', label: 'Efectivo', Icon: Banknote },
    { key: 'transferencia', label: 'Transferencia', Icon: ArrowRightLeft },
    { key: 'mixto', label: 'Desglosado', Icon: Layers },
  ];

  const handleConfirm = () => {
    let pagos = [];
    if (esEfectivo) {
      pagos = [{ metodo: 'efectivo', moneda: cashCurrency, monto: received || due, baseUsd: total }];
    } else if (esTransfer) {
      pagos = [{ metodo: 'transferencia', moneda: 'CUP', monto: totalFinal * rate, baseUsd: total, recargoPct }];
    } else { // mixto
      if (nTransfer > 0) pagos.push({ metodo: 'transferencia', moneda: 'CUP', monto: nTransfer * (1 + sTransferPct / 100) * rate, baseUsd: nTransfer, recargoPct: sTransferPct });
      if (nUsd > 0) pagos.push({ metodo: 'efectivo', moneda: 'USD', monto: nUsd, baseUsd: nUsd });
      if (nCup > 0) pagos.push({ metodo: 'efectivo', moneda: 'CUP', monto: nCup, baseUsd: nCup / rate });
      if (nEur > 0) pagos.push({ metodo: 'efectivo', moneda: 'EUR', monto: nEur, baseUsd: fromCur(nEur, 'EUR') });
    }
    onConfirm({
      metodoPago,
      recargoPct: esMixto ? sTransferPct : recargoPct,
      recargo: esMixto ? mixRecargo : recargoMonto,
      montoFinal: granTotal,
      moneda: esEfectivo ? cashCurrency : esMixto ? 'mixto' : 'CUP',
      recibido: esEfectivo ? received : null,
      cambio: esEfectivo ? (change > 0 ? change : 0) : esMixto ? mixCambio : 0,
      pagos,
      tasas: { usd: rate, eur: eurRate, fecha: new Date().toISOString() },
    });
  };

  const splitLine = (label, value, setValue, cur) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 92, flexShrink: 0 }}>{label}</span>
      <input type="number" min="0" placeholder="0" value={value} onChange={e => setValue(e.target.value)}
        style={{ flex: 1, padding: '8px 10px', fontSize: 14, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 34 }}>{cur}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cobro" width={470}>
      <div data-modal>
        {/* Total */}
        <div style={{ textAlign: 'center', padding: '12px 0 18px', borderBottom: '1px solid #F3F4F6', marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Total a cobrar</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -1 }}>
            {formatCurrency(granTotal)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <MoneySub usd={granTotal} size={13} align="center" />
          </div>
          {(descuento > 0 || recargoMonto > 0 || (esMixto && mixRecargo > 0)) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>Base: {formatCurrency(total)}</span>
              {descuento > 0 && <span style={{ color: '#22C55E' }}>Descuento aplicado: −{formatCurrency(descuento)}</span>}
              {(recargoMonto > 0 || (esMixto && mixRecargo > 0)) && <span style={{ color: '#B45309' }}>Recargo transferencia: +{formatCurrency(esMixto ? mixRecargo : recargoMonto)}</span>}
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Método de pago
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {payMethods.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => pickMethod(key)}
                style={{
                  padding: '14px 4px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${metodoPago === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: metodoPago === key ? 'var(--accent)' : '#fff',
                  color: metodoPago === key ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                }}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recargo (%) — Transferencia simple, 0-40% (0 = sin recargo) */}
        {esTransfer && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recargo transferencia</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min="0" max="40" value={recargoPct}
                  onChange={e => setRecargoPct(Math.min(40, Math.max(0, parseFloat(e.target.value) || 0)))}
                  style={{ width: 52, padding: '4px 6px', fontSize: 13, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 6, outline: 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 10, 20, 30, 40].map(p => (
                <button key={p} onClick={() => setRecargoPct(p)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    border: `1.5px solid ${recargoPct === p ? 'var(--accent)' : 'var(--border)'}`,
                    background: recargoPct === p ? 'var(--accent)' : '#fff', color: recargoPct === p ? '#fff' : 'var(--text-secondary)' }}
                >{p === 0 ? 'Sin' : `${p}%`}</button>
              ))}
            </div>
          </div>
        )}

        {/* Efectivo: moneda (USD/CUP/EUR) + importe recibido */}
        {esEfectivo && (
          <div style={{ background: '#F7F7F7', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['USD', 'CUP', 'EUR'].map(m => (
                <button key={m} onClick={() => { setCashCurrency(m); setCashReceived(''); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    border: `1.5px solid ${cashCurrency === m ? 'var(--accent)' : 'var(--border)'}`,
                    background: cashCurrency === m ? 'var(--accent)' : '#fff', color: cashCurrency === m ? '#fff' : 'var(--text-secondary)' }}
                >{m}</button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Importe entregado ({cashCurrency})</span>
              <span style={{ color: 'var(--text-muted)' }}>A cobrar: {fmtCur(due, cashCurrency)}</span>
            </label>
            <input type="number" placeholder={due.toFixed(2)} value={cashReceived} onChange={e => setCashReceived(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 18, fontWeight: 700, border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none', textAlign: 'right', fontFamily: 'var(--font-sans)' }}
              autoFocus />
            {cashReceived !== '' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cambio</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: change >= 0 ? '#22C55E' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {change >= 0 ? fmtCur(change, cashCurrency) : (<><AlertTriangle size={16} style={{ flexShrink: 0 }} /> Insuficiente</>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transferencia simple: nota */}
        {esTransfer && (
          <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            Transferencia bancaria (CUP) — total con recargo: <b>{formatCup(totalFinal)}</b>.
          </div>
        )}

        {/* Desglosado (mixto) */}
        {esMixto && (
          <div style={{ background: '#F7F7F7', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Reparte el total entre los métodos. La transferencia suma su recargo encima.
            </div>
            {/* Transferencia con recargo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 92, flexShrink: 0 }}>Transferencia</span>
              <input type="number" min="0" placeholder="0" value={sTransfer} onChange={e => setSTransfer(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', fontSize: 14, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 34 }}>CUP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 92, flexShrink: 0, textAlign: 'right', paddingRight: 2 }}>Recargo</span>
              <div style={{ flex: 1, display: 'flex', gap: 4, minWidth: 0 }}>
                {[0, 10, 15, 20, 30, 40].map(p => (
                  <button key={p} onClick={() => setSTransferPct(p)}
                    style={{ flex: 1, minWidth: 0, padding: '4px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      border: `1px solid ${sTransferPct === p ? 'var(--accent)' : 'var(--border)'}`,
                      background: sTransferPct === p ? 'var(--accent)' : '#fff', color: sTransferPct === p ? '#fff' : 'var(--text-secondary)' }}
                  >{p === 0 ? 'Sin' : `${p}%`}</button>
                ))}
              </div>
              <span style={{ width: 34, flexShrink: 0 }} />
            </div>
            {splitLine('Efectivo', sUsd, setSUsd, 'USD')}
            {splitLine('Efectivo', sCup, setSCup, 'CUP')}
            {splitLine('Efectivo', sEur, setSEur, 'EUR')}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nTransfer > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B45309' }}>
                  <span>Transfiere (con +{sTransferPct}%)</span>
                  <span>{formatCup(nTransfer * (1 + sTransferPct / 100))}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: mixIncompleto ? 'var(--danger)' : '#22C55E' }}>
                <span>{mixIncompleto ? 'Falta por cubrir' : (mixCambio > 0 ? 'Cambio' : 'Cubierto')}</span>
                <span>{mixIncompleto ? formatCurrency(mixRestante) : (mixCambio > 0 ? formatCurrency(mixCambio) : '✓')}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={disabled}
            style={{
              flex: 2, padding: '12px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            {confirming ? <div className="spinner sm white" /> : <CheckCircle2 size={16} />}
            {confirming ? 'Procesando...' : `Confirmar ${formatCurrency(granTotal)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Página principal POS ──────────────────────────────────────────
export function POS() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  const { items, getTotal, getSubtotal, getDescuentoMonto, clearCart } = useCartStore();
  const addVenta = useSalesStore(s => s.addVenta);
  const addPendingOrder = useSyncStore(s => s.addPendingOrder);
  const currentUser = useAuthStore(s => s.currentUser);
  const toast = useToastStore();

  const handleAddProduct = useCallback((product) => {
    addProductToCart(product);
  }, []);

  const handleConfirmSale = async (paymentInfo) => {
    const {
      metodoPago, recargoPct = 0, recargo = 0, montoFinal, moneda = 'CUP', pagos = null, tasas = null,
    } = paymentInfo || {};
    setConfirming(true);
    const finalTotal = montoFinal != null ? montoFinal : getTotal();
    const ventaData = {
      items,
      total: finalTotal,
      subtotal: getSubtotal(),
      descuento: getDescuentoMonto(),
      recargo,
      recargoPct,
      moneda,
      metodoPago,
      pagos,
      tasas,
      dependienta: currentUser,
    };

    const ventaItems = [...items];
    const userNombre = currentUser?.nombre;
    try {
      // 1. Guardar venta localmente (fuente de verdad) y mostrar éxito al instante.
      const venta = await addVenta(ventaData);

      // 2. Rebajar stock en caché local (IndexedDB)
      for (const item of ventaItems) {
        if (item.stock > 0 || item.gestionar_stock) {
          updateCachedProductStock(item.id || item.woo_id, -item.cantidad).catch(() => {});
        }
      }

      setLastSale(venta);
      clearCart();
      setPaymentOpen(false);
      setPrintOpen(true);
      setConfirming(false);

      // 3. Sincronizar con WooCommerce EN SEGUNDO PLANO (no bloquea la caja).
      (async () => {
        for (let i = 0; i < 3; i++) {
          try {
            await createOrder({ ...ventaData, dependienta: userNombre });
            return;
          } catch {
            if (i < 2) await new Promise(r => setTimeout(r, 1000));
          }
        }
        addPendingOrder({ ...ventaData, dependienta: userNombre }, venta.id);
      })();
    } catch (err) {
      toast.error(`Error al procesar: ${err.message}`);
      setConfirming(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Izquierda: búsqueda + grid de productos */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', background: '#F7F7F7', overflow: 'hidden' }}>
        <SearchPanel onAddProduct={handleAddProduct} />
      </div>

      {/* Derecha: carrito (ancho fijo) */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CartPanel onCheckout={() => {
          if (items.length === 0) { toast.warning('El carrito está vacío'); return; }
          setPaymentOpen(true);
        }} />
      </div>

      {/* Modal de pago */}
      <PaymentModal
        key={paymentOpen ? 'pay-open' : 'pay-closed'}
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handleConfirmSale}
        total={getTotal()}
        descuento={getDescuentoMonto()}
        confirming={confirming}
      />

      {/* Modal post-venta */}
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} title={null} width={400}>
        {lastSale && (
          <div style={{ textAlign: 'center', padding: '24px 0' }} data-modal>
            {/* Check animado */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#F0FDF4', border: '2.5px solid #22C55E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#22C55E',
            }}>
              <CheckCircle2 size={36} />
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              ¡Cobro completado!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'monospace', fontWeight: 600 }}>
              {lastSale.numero}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -1 }}>
              {formatCurrency(lastSale.total)}
            </div>
            <div style={{ marginTop: 4, marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
              <MoneySub usd={lastSale.total} size={13} align="center" />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: lastSale.recargo > 0 ? 6 : 24 }}>
              Pago con {lastSale.metodo_pago} · {lastSale.dependienta}
            </div>
            {lastSale.recargo > 0 && (
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 24 }}>
                Incluye recargo {lastSale.recargo_pct}%: +{formatCurrency(lastSale.recargo)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  const copias = printReceipt(lastSale);
                  if (copias) toast.success(`Enviando ${copias} copia${copias > 1 ? 's' : ''} a la impresora`);
                  else toast.error('No se pudo enviar a la impresora');
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: '#fff',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#F7F7F7'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
              >
                <Printer size={16} /> Imprimir ticket
              </button>
              <button
                onClick={() => setPrintOpen(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                Nueva venta
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
