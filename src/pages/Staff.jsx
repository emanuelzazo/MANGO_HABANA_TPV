import { useState } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, List, LayoutGrid, Upload, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSalesList } from '../store/useSalesList';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToastStore } from '../store/toastStore';
import { formatCurrency } from '../utils/format';

const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

function Avatar({ user, size = 48 }) {
  if (user.foto) {
    return <img src={user.foto} alt={user.nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 600, color: 'var(--text-secondary)' }}>{(user.nombre || '?')[0].toUpperCase()}</span>
    </div>
  );
}

// Alta de dependienta: solo nombre + foto (sin login). Para administrador
// se piden usuario y contraseña (necesarios para iniciar sesión).
function UserForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: initialData?.nombre || '',
    foto: initialData?.foto || '',
    rol: initialData?.rol || 'dependienta',
    usuario: initialData?.usuario || '',
    password: '',
  });
  const esAdmin = form.rol === 'administrador';

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    if (esAdmin && !initialData && (!form.usuario || !form.password)) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Foto */}
      <div className="flex items-center gap-4">
        <Avatar user={form} size={64} />
        <div className="flex items-center gap-2">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Upload size={14} /> Subir foto
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {form.foto && (
            <button type="button" onClick={() => setForm(p => ({ ...p, foto: '' }))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
              <X size={13} /> Quitar
            </button>
          )}
        </div>
      </div>

      <Input label="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required autoFocus />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Rol</label>
        <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="dependienta">Dependienta</option>
          <option value="administrador">Administrador</option>
          <option value="visor">Visor (solo lectura)</option>
        </select>
      </div>

      {/* Solo el administrador necesita credenciales para entrar */}
      {esAdmin && (
        <>
          <Input label="Usuario (login)" value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))} required={!initialData} />
          <Input label={initialData ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!initialData} />
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button type="submit" className="flex-1">Guardar</Button>
      </div>
    </form>
  );
}

export function Staff() {
  const { getUsers, createUser, updateUser, toggleUserStatus } = useAuthStore();
  const ventas = useSalesList();
  const toast = useToastStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState(() => getUsers());
  const [layout, setLayout] = useState(() => localStorage.getItem('tpv_staff_layout') || 'list');

  const setLayoutPersist = (l) => { localStorage.setItem('tpv_staff_layout', l); setLayout(l); };
  const refresh = () => setUsers(getUsers());

  const handleSave = (data) => {
    const payload = { nombre: data.nombre.trim(), foto: data.foto || '', rol: data.rol };
    if (data.rol === 'administrador') {
      payload.usuario = data.usuario.trim();
    } else {
      payload.usuario = (data.usuario || slug(data.nombre)).trim();
    }
    if (editingUser) {
      if (data.password) payload.password = data.password;
      updateUser(editingUser.id, payload);
      toast.success('Dependienta actualizada');
    } else {
      payload.password = data.password || '';
      createUser(payload);
      toast.success('Dependienta añadida');
    }
    refresh();
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleToggle = (user) => {
    toggleUserStatus(user.id);
    refresh();
    toast.info(`${user.nombre} ${user.estado ? 'desactivada' : 'activada'}`);
  };

  const statsFor = (nombre) => {
    const userVentas = ventas.filter(v => v.dependienta === nombre);
    return { ventas: userVentas.length, total: userVentas.reduce((s, v) => s + v.total, 0) };
  };

  const layoutBtnStyle = (value) => ({
    padding: 8, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
    background: layout === value ? 'var(--accent)' : '#fff',
    color: layout === value ? '#fff' : 'var(--text-muted)',
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dependientas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} en el sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLayoutPersist('list')} style={layoutBtnStyle('list')} title="Vista lista"><List size={16} /></button>
          <button onClick={() => setLayoutPersist('grid')} style={layoutBtnStyle('grid')} title="Vista cuadrícula"><LayoutGrid size={16} /></button>
          <Button icon={Plus} onClick={() => { setEditingUser(null); setModalOpen(true); }}>
            Nueva dependienta
          </Button>
        </div>
      </div>

      {layout === 'list' ? (
        <div className="flex flex-col gap-3">
          {users.map(user => {
            const stats = statsFor(user.nombre);
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <Avatar user={user} size={48} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                    <Badge variant={user.rol === 'administrador' ? 'purple' : 'default'}>
                      {user.rol === 'administrador' ? 'Admin' : 'Dependienta'}
                    </Badge>
                    {!user.estado && <Badge variant="danger">Inactiva</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stats.ventas} ventas · {formatCurrency(stats.total)} facturado
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingUser(user); setModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleToggle(user)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    {user.estado ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {users.map(user => {
            const stats = statsFor(user.nombre);
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center">
                <Avatar user={user} size={72} />
                <p className="text-sm font-semibold text-gray-900 mt-3">{user.nombre}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={user.rol === 'administrador' ? 'purple' : 'default'}>
                    {user.rol === 'administrador' ? 'Admin' : 'Dependienta'}
                  </Badge>
                  {!user.estado && <Badge variant="danger">Inactiva</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-2">{stats.ventas} ventas · {formatCurrency(stats.total)}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => { setEditingUser(user); setModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleToggle(user)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    {user.estado ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        title={editingUser ? 'Editar dependienta' : 'Nueva dependienta'}
        size="sm"
      >
        <UserForm
          initialData={editingUser}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingUser(null); }}
        />
      </Modal>
    </div>
  );
}
