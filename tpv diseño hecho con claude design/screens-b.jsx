// screens-b.jsx — Punto de Venta (POS) — most critical screen

function POSScreen({ onToast }) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('Todas');
  const [cart, setCart] = React.useState([]);
  const [discount, setDiscount] = React.useState(0);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState('tarjeta');
  const [cashGiven, setCashGiven] = React.useState('');
  const [checkoutDone, setCheckoutDone] = React.useState(false);
  const [ticketNum] = React.useState(() => 'TK-' + String(Math.floor(Math.random() * 900) + 1249).padStart(6, '0'));

  // Filter products
  const filtered = PRODUCTS.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()) || p.barcode.includes(query);
    const matchC = category === 'Todas' || p.category === category;
    return matchQ && matchC;
  });

  const addToCart = (product) => {
    if (product.stock === 0) { onToast('Sin stock disponible', 'error'); return; }
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) {
        if (ex.qty >= product.stock) { onToast('Stock insuficiente', 'error'); return prev; }
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product.id !== id));
  const setQty = (id, qty) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: Math.min(qty, i.product.stock) } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal - discountAmt;
  const change = parseFloat(cashGiven || 0) - total;

  const confirmCheckout = () => {
    setCheckoutDone(true);
    setTimeout(() => {
      setCheckoutDone(false);
      setCheckoutOpen(false);
      setCart([]);
      setDiscount(0);
      setCashGiven('');
      setPayMethod('tarjeta');
      onToast(`Venta ${ticketNum} registrada correctamente`, 'success');
    }, 2200);
  };

  const payMethods = [
    { key: 'tarjeta',  label: 'Tarjeta',   Icon: IcoCreditCard },
    { key: 'efectivo', label: 'Efectivo',   Icon: IcoBanknote },
    { key: 'bizum',    label: 'Bizum',      Icon: IcoSmartphone },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT: Product search + grid ── */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', padding: '24px 20px 24px 28px', overflow: 'hidden' }}>
        {/* Page title + category filter */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 14 }}>Punto de Venta</h1>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Input
                placeholder="Buscar producto, SKU o escanear código de barras..."
                value={query} onChange={e => setQuery(e.target.value)}
                icon={<IcoScan size={16} />}
                style={{ fontSize: 15, padding: '12px 12px 12px 40px', border: '2px solid #111', borderRadius: 10 }}
              />
            </div>
          </div>
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: category === c ? '#111' : '#fff',
                color: category === c ? '#fff' : '#6B6B6B',
                border: `1px solid ${category === c ? '#111' : '#E8E8E8'}`,
                transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#AAAAAA' }}>
              <IcoPackage size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Sin resultados para "{query}"</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} inCart={cart.find(i => i.product.id === p.id)?.qty} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
      <div style={{ flex: '0 0 40%', borderLeft: '1px solid #E8E8E8', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Carrito actual</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ fontSize: 12, color: '#AAAAAA', background: 'none', border: 'none', cursor: 'pointer' }}>Vaciar</button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#AAAAAA' }}>
              <IcoCart size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>El carrito está vacío</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Escanea o busca un producto</div>
            </div>
          ) : cart.map((item, i) => (
            <CartItem key={item.product.id} item={item}
              onQty={(q) => setQty(item.product.id, q)}
              onRemove={() => removeFromCart(item.product.id)}
              last={i === cart.length - 1}
            />
          ))}
        </div>

        {/* Totals + checkout */}
        <div style={{ borderTop: '1px solid #E8E8E8', padding: '16px 24px 20px' }}>
          {/* Discount row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#6B6B6B' }}>Descuento</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 5, 10, 15, 20].map(d => (
                <button key={d} onClick={() => setDiscount(d)} style={{
                  padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: discount === d ? '#111' : '#F7F7F7',
                  color: discount === d ? '#fff' : '#6B6B6B',
                  border: '1px solid transparent', cursor: 'pointer',
                }}>{d}%</button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#F7F7F7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#6B6B6B' }}>Subtotal</span>
              <span style={{ fontSize: 13, color: '#111' }}>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#22C55E' }}>Descuento ({discount}%)</span>
                <span style={{ fontSize: 13, color: '#22C55E' }}>−{fmt(discountAmt)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E8E8E8', marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>TOTAL</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>{fmt(total)}</span>
            </div>
          </div>

          <Btn fullWidth size="lg" disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}
            style={{ fontSize: 16, letterSpacing: 0.5 }}>
            Cobrar →
          </Btn>
        </div>
      </div>

      {/* ── CHECKOUT MODAL ── */}
      <Modal open={checkoutOpen} onClose={() => !checkoutDone && setCheckoutOpen(false)} title={checkoutDone ? null : 'Cobro'} width={440}>
        {checkoutDone ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#22C55E' }}>
              <IcoCheck size={28} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>¡Cobro completado!</div>
            <div style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 6 }}>{ticketNum} · {fmt(total)}</div>
            <div style={{ fontSize: 13, color: '#AAAAAA' }}>Imprimiendo ticket...</div>
          </div>
        ) : (
          <div>
            {/* Total */}
            <div style={{ textAlign: 'center', padding: '16px 0 20px', borderBottom: '1px solid #F3F4F6', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 4 }}>Total a cobrar</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#111', letterSpacing: -1 }}>{fmt(total)}</div>
              {discount > 0 && <div style={{ fontSize: 12, color: '#22C55E', marginTop: 2 }}>Descuento {discount}% aplicado</div>}
            </div>

            {/* Payment method */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Método de pago</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {payMethods.map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setPayMethod(key)} style={{
                    padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${payMethod === key ? '#111' : '#E8E8E8'}`,
                    background: payMethod === key ? '#111' : '#fff',
                    color: payMethod === key ? '#fff' : '#6B6B6B',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  }}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash calculator */}
            {payMethod === 'efectivo' && (
              <div style={{ background: '#F7F7F7', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', display: 'block', marginBottom: 6 }}>Importe entregado</label>
                  <Input type="number" placeholder="0,00" value={cashGiven} onChange={e => setCashGiven(e.target.value)} style={{ fontSize: 18, fontWeight: 600, textAlign: 'right' }} />
                </div>
                {parseFloat(cashGiven) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E8E8E8' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Cambio</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: change >= 0 ? '#22C55E' : '#EF4444' }}>
                      {change >= 0 ? fmt(change) : '⚠ Importe insuficiente'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cart summary */}
            <div style={{ marginBottom: 16, fontSize: 13, color: '#6B6B6B' }}>
              {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cart.reduce((s,i) => s + i.qty, 0)} unidades
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setCheckoutOpen(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={confirmCheckout}
                disabled={payMethod === 'efectivo' && (parseFloat(cashGiven) < total || !cashGiven)}
                style={{ flex: 2, fontSize: 15 }}>
                <IcoCheck size={16} /> Confirmar cobro
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, onAdd, inCart }) {
  const [hover, setHover] = React.useState(false);
  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 3;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 12, border: `1.5px solid ${hover && !outOfStock ? '#111' : '#E8E8E8'}`,
        padding: 14, cursor: outOfStock ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: outOfStock ? 0.5 : 1,
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: hover && !outOfStock ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
      }}
      onClick={() => !outOfStock && onAdd()}
    >
      {/* Image placeholder */}
      <div style={{
        height: 90, borderRadius: 8, background: `${product.color}22`,
        border: `1px solid ${product.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${product.color}88` }} />
        {inCart && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: '#111', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart}</div>
        )}
        {outOfStock && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#EF4444' }}>SIN STOCK</div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3, marginBottom: 2 }}>{product.name}</div>
        <div style={{ fontSize: 11, color: '#AAAAAA' }}>{product.category}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{fmt(product.price)}</span>
        {lowStock && <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>Últimas {product.stock}</span>}
        {!outOfStock && (
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: hover ? '#111' : '#F7F7F7',
            color: hover ? '#fff' : '#111',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}>
            <IcoPlus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Cart Item ─────────────────────────────────────────────────
function CartItem({ item, onQty, onRemove, last }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: last ? 'none' : '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
      <ImgPlaceholder w={36} h={36} color={item.product.color} radius={6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
        <div style={{ fontSize: 12, color: '#AAAAAA' }}>{fmt(item.product.price)} / ud</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onQty(item.qty - 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }}>
          <IcoMinus size={12} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, width: 20, textAlign: 'center', color: '#111' }}>{item.qty}</span>
        <button onClick={() => onQty(item.qty + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }}>
          <IcoPlus size={12} />
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111', width: 64, textAlign: 'right', flexShrink: 0 }}>{fmt(item.product.price * item.qty)}</div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA', padding: 4, flexShrink: 0, borderRadius: 4, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#AAAAAA'}>
        <IcoTrash size={14} />
      </button>
    </div>
  );
}

Object.assign(window, { POSScreen, ProductCard, CartItem });
