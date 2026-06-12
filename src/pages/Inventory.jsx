import { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { fetchAllProducts, normalizeProduct } from '../api/products';
import { getCachedProducts, cacheProducts } from '../utils/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { useToastStore } from '../store/toastStore';
import { formatCurrency } from '../utils/format';

function getStockBadge(stock, umbral = 5) {
  if (stock <= 0) return <Badge variant="danger">Sin stock</Badge>;
  if (stock <= umbral) return <Badge variant="warning">Stock bajo ({stock})</Badge>;
  return <Badge variant="success">{stock} uds.</Badge>;
}

function SortIcon({ column, sortBy, sortDir }) {
  if (sortBy !== column) return <ArrowUpDown size={14} className="text-gray-300" />;
  return sortDir === 'asc'
    ? <ArrowUp size={14} className="text-gray-600" />
    : <ArrowDown size={14} className="text-gray-600" />;
}

export function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const toast = useToastStore();

  const umbral = (() => {
    try {
      const c = JSON.parse(localStorage.getItem('tpv_config') || '{}');
      if (c.stock_bajo_activo === false) return 0; // alertas desactivadas → solo "sin stock"
      return parseInt(c.umbral_stock ?? 5);
    } catch { return 5; }
  })();

  const loadProducts = async (showToast = false) => {
    // Cache-first: muestra la caché al instante; refresca en vivo y re-cachea.
    const cached = await getCachedProducts().catch(() => []);
    if (cached.length) { setProducts(cached); setLoading(false); }
    else setLoading(true);
    try {
      const prods = await fetchAllProducts();
      const norm = prods.map(normalizeProduct);
      setProducts(norm);
      if (norm.length) cacheProducts(norm).catch(() => {});
      if (showToast) toast.success(`${norm.length} productos sincronizados`);
    } catch (err) {
      if (showToast) toast.error(`Error al sincronizar: ${err.message}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Carga inicial desde WooCommerce/caché al montar.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadProducts(); }, []);

  const handleSync = () => { setSyncing(true); loadProducts(true); };

  const handleSort = (col) => {
    if (sortBy === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(col); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.codigo_barras?.includes(q)
      );
    }

    if (categoryFilter) {
      result = result.filter(p => p.categoria === categoryFilter);
    }

    result.sort((a, b) => {
      let va = a[sortBy] ?? '';
      let vb = b[sortBy] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, search, categoryFilter, sortBy, sortDir]);

  const uniqueCategories = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort();

  const thCell = (col, label) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon column={col} sortBy={sortBy} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="p-8 flex flex-col gap-6 min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} productos sincronizados</p>
        </div>
        <Button variant="secondary" onClick={handleSync} loading={syncing} icon={RefreshCw}>
          Sincronizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
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
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{products.length === 0 ? 'Sin productos — configura WooCommerce y sincroniza' : 'Sin resultados para este filtro'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-16"></th>
                  {thCell('nombre','Producto')}
                  {thCell('sku','SKU')}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Código de barras</th>
                  {thCell('precio','Precio')}
                  {thCell('categoria','Categoría')}
                  {thCell('stock','Stock')}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {product.imagen_url ? (
                        <img src={product.imagen_url} alt={product.nombre} className="w-10 h-10 object-cover rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{product.nombre}</p>
                      {!product.activo && <Badge variant="warning" className="mt-0.5">Inactivo</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{product.codigo_barras || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(product.precio_oferta || product.precio)}</span>
                        {product.precio_oferta && (
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.precio)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{product.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {getStockBadge(product.stock, umbral)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
