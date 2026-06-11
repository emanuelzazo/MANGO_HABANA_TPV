import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, Edit2, Package, RefreshCw,
  Save, X, Printer, ToggleLeft, ToggleRight, ChevronDown,
  AlertCircle, ExternalLink,
} from 'lucide-react';
import {
  fetchAllProducts, fetchCategories, normalizeProduct,
  updateProduct, createProduct,
} from '../api/products';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { useToastStore } from '../store/toastStore';
import { formatCurrency } from '../utils/format';
import { printProductLabel } from '../utils/print';

// --- Formulario de producto (crear / editar) ---
function ProductForm({ product, categories, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: product?.nombre || '',
    sku: product?.sku || '',
    regular_price: product?.precio_regular?.toString() || product?.precio?.toString() || '',
    sale_price: product?.precio_oferta?.toString() || '',
    stock_quantity: product?.stock?.toString() || '0',
    manage_stock: product?.gestionar_stock ?? true,
    category_id: product?.categoria_id?.toString() || '',
    barcode: product?.codigo_barras || '',
    status: product?.activo !== false ? 'publish' : 'draft',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.regular_price) return;

    const data = {
      name: form.name,
      sku: form.sku,
      regular_price: form.regular_price,
      sale_price: form.sale_price || '',
      stock_quantity: form.manage_stock ? parseInt(form.stock_quantity) || 0 : null,
      manage_stock: form.manage_stock,
      status: form.status,
      categories: form.category_id ? [{ id: parseInt(form.category_id) }] : [],
      meta_data: form.barcode ? [{ key: '_barcode', value: form.barcode }] : [],
    };
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre del producto *"
        value={form.name}
        onChange={e => set('name', e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU" value={form.sku} onChange={e => set('sku', e.target.value)} />
        <Input label="Código de barras" value={form.barcode} onChange={e => set('barcode', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Precio regular (CUP) *" type="number" min="0" step="0.01" value={form.regular_price} onChange={e => set('regular_price', e.target.value)} required />
        <Input label="Precio de oferta (CUP)" type="number" min="0" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Categoría</label>
        <select
          value={form.category_id}
          onChange={e => set('category_id', e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Sin categoría</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stock */}
      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.manage_stock}
            onChange={e => set('manage_stock', e.target.checked)}
            className="w-4 h-4 rounded accent-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">Gestionar stock</span>
        </label>
        {form.manage_stock && (
          <Input
            label="Cantidad en stock"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={e => set('stock_quantity', e.target.value)}
          />
        )}
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Estado en tienda</label>
        <select
          value={form.status}
          onChange={e => set('status', e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="publish">Publicado (visible)</option>
          <option value="draft">Borrador (oculto)</option>
          <option value="private">Privado</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={saving} icon={Save} className="flex-1">
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
}

// --- Modal detalle de producto ---
function ProductDetail({ product, categories, onEdit, onToggle, onClose, onLabelPrint }) {
  if (!product) return null;
  const umbral = (() => { try { return parseInt(JSON.parse(localStorage.getItem('tpv_config') || '{}').umbral_stock ?? 5); } catch { return 5; } })();

  return (
    <div className="flex flex-col gap-5">
      {/* Imagen + info básica */}
      <div className="flex gap-4">
        {product.imagen_url ? (
          <img src={product.imagen_url} alt={product.nombre} className="w-28 h-28 object-cover rounded-xl shrink-0" />
        ) : (
          <div className="w-28 h-28 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
            <Package size={32} className="text-gray-300" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{product.nombre}</h3>
          <p className="text-xs text-gray-400 mt-0.5">ID WooCommerce: #{product.woo_id}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold text-gray-900">{formatCurrency(product.precio_oferta || product.precio)}</span>
            {product.precio_oferta && (
              <span className="text-sm text-gray-400 line-through">{formatCurrency(product.precio)}</span>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant={product.activo ? 'success' : 'warning'}>
              {product.activo ? 'Publicado' : 'Borrador'}
            </Badge>
            <Badge variant={product.stock <= 0 ? 'danger' : product.stock <= umbral ? 'warning' : 'default'}>
              {product.stock <= 0 ? 'Sin stock' : `${product.stock} uds.`}
            </Badge>
            {product.categoria && <Badge>{product.categoria}</Badge>}
          </div>
        </div>
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
        <div><p className="text-xs text-gray-500">SKU</p><p className="font-mono font-medium text-gray-900">{product.sku || '—'}</p></div>
        <div><p className="text-xs text-gray-500">Código de barras</p><p className="font-mono font-medium text-gray-900">{product.codigo_barras || '—'}</p></div>
        <div><p className="text-xs text-gray-500">Precio regular</p><p className="font-medium text-gray-900">{formatCurrency(product.precio_regular || product.precio)}</p></div>
        <div><p className="text-xs text-gray-500">Precio oferta</p><p className="font-medium text-gray-900">{product.precio_oferta ? formatCurrency(product.precio_oferta) : '—'}</p></div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button icon={Edit2} onClick={onEdit} className="flex-1">Editar</Button>
        <Button
          variant={product.activo ? 'warning' : 'success'}
          icon={product.activo ? ToggleLeft : ToggleRight}
          onClick={() => onToggle(product)}
          className="flex-1"
        >
          {product.activo ? 'Desactivar' : 'Activar'}
        </Button>
        <Button variant="secondary" icon={Printer} onClick={() => onLabelPrint(product)} className="w-full">
          Imprimir etiqueta Zebra
        </Button>
      </div>
    </div>
  );
}

// --- Página principal ---
export function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();

  const loadAll = async (showToast = false) => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchAllProducts(), fetchCategories()]);
      setProducts(prods.map(normalizeProduct));
      setCategories(cats);
      if (showToast) toast.success(`${prods.length} productos cargados`);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    let r = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.codigo_barras?.includes(q)
      );
    }
    if (categoryFilter) r = r.filter(p => p.categoria === categoryFilter);
    return r;
  }, [products, search, categoryFilter]);

  const uniqueCategories = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort();

  const handleSaveProduct = async (data) => {
    setSaving(true);
    try {
      if (editProduct) {
        await updateProduct(editProduct.woo_id, data);
        toast.success('Producto actualizado en WooCommerce');
        setEditProduct(null);
        setDetailProduct(null);
      } else {
        await createProduct({ ...data, type: 'simple' });
        toast.success('Producto creado en WooCommerce');
        setCreateOpen(false);
      }
      loadAll();
    } catch (err) {
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (product) => {
    try {
      await updateProduct(product.woo_id, {
        status: product.activo ? 'draft' : 'publish',
      });
      toast.success(`Producto ${product.activo ? 'desactivado' : 'activado'}`);
      setDetailProduct(null);
      loadAll();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const umbral = (() => { try { return parseInt(JSON.parse(localStorage.getItem('tpv_config') || '{}').umbral_stock ?? 5); } catch { return 5; } })();

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} productos en WooCommerce</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={() => { setSyncing(true); loadAll(true); }}>
            Sincronizar
          </Button>
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Nuevo producto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <Input
          icon={Search}
          placeholder="Buscar por nombre, SKU o código de barras..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          wrapperClassName="flex-1"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[180px]"
        >
          <option value="">Todas las categorías</option>
          {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid de productos */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{products.length === 0 ? 'Sin productos — configura WooCommerce y sincroniza' : 'Sin resultados'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(product => (
            <button
              key={product.id}
              onClick={() => setDetailProduct(product)}
              className="bg-white border border-gray-100 rounded-2xl p-3 text-left hover:border-gray-300 hover:shadow-sm transition-all group flex flex-col gap-2"
            >
              {product.imagen_url ? (
                <img src={product.imagen_url} alt={product.nombre} className="w-full aspect-square object-cover rounded-xl" />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                  <Package size={28} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">{product.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{product.sku || '—'}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(product.precio_oferta || product.precio)}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {!product.activo && <Badge variant="warning">Inactivo</Badge>}
                {product.stock <= 0 && <Badge variant="danger">Sin stock</Badge>}
                {product.stock > 0 && product.stock <= umbral && <Badge variant="warning">{product.stock} uds.</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal detalle producto */}
      <Modal
        isOpen={!!detailProduct && !editProduct}
        onClose={() => setDetailProduct(null)}
        title="Detalle del producto"
        size="md"
      >
        <ProductDetail
          product={detailProduct}
          categories={categories}
          onEdit={() => setEditProduct(detailProduct)}
          onToggle={handleToggle}
          onClose={() => setDetailProduct(null)}
          onLabelPrint={(p) => { printProductLabel(p); toast.success('Enviando a impresora...'); }}
        />
      </Modal>

      {/* Modal editar producto */}
      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Editar producto"
        size="md"
      >
        <ProductForm
          product={editProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setEditProduct(null)}
          saving={saving}
        />
      </Modal>

      {/* Modal crear producto */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo producto"
        size="md"
      >
        <ProductForm
          product={null}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setCreateOpen(false)}
          saving={saving}
        />
      </Modal>
    </div>
  );
}
