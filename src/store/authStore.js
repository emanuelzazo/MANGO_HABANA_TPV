/**
 * authStore.js — Estado de autenticación y sesión de usuario.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Usuarios predeterminados del sistema (en Fase 3 migrar a SQLite)
const DEFAULT_USERS = [
  {
    id: 1,
    nombre: 'Mango Habana',
    usuario: 'mango',
    password: 'mangohabana01',
    rol: 'administrador',
    estado: true,
    fecha_creacion: new Date().toISOString(),
  },
];

function loadUsers() {
  let users = null;
  try {
    const stored = localStorage.getItem('tpv_users');
    if (stored) users = JSON.parse(stored);
  } catch { /* noop */ }
  if (!users) users = [...DEFAULT_USERS];

  // Migración: el administrador debe poder entrar con mango / mangohabana01.
  const admin = users.find(u => u.rol === 'administrador');
  if (admin && (admin.usuario !== 'mango' || admin.password !== 'mangohabana01')) {
    admin.usuario = 'mango';
    admin.password = 'mangohabana01';
    localStorage.setItem('tpv_users', JSON.stringify(users));
  } else if (!localStorage.getItem('tpv_users')) {
    localStorage.setItem('tpv_users', JSON.stringify(users));
  }
  return users;
}

function saveUsers(users) {
  localStorage.setItem('tpv_users', JSON.stringify(users));
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: true, // sin login: se entra directo a la app
      loginError: null,

      // Garantiza que haya un usuario activo (admin por defecto) al abrir la app.
      ensureActiveUser: () => {
        if (get().currentUser) return;
        const users = loadUsers();
        const admin = users.find(u => u.rol === 'administrador') || users[0];
        if (admin) set({ currentUser: admin, isAuthenticated: true });
      },

      login: (usuario, password, recordar) => {
        const users = loadUsers();
        const user = users.find(
          u => u.usuario === usuario && u.password === password && u.estado
        );

        if (!user) {
          set({ loginError: 'Usuario o contraseña incorrectos' });
          return false;
        }

        set({
          currentUser: user,
          isAuthenticated: true,
          loginError: null,
        });

        if (recordar) {
          localStorage.setItem('tpv_remember_user', usuario);
          localStorage.setItem('tpv_remember_pass', password);
        } else {
          localStorage.removeItem('tpv_remember_user');
          localStorage.removeItem('tpv_remember_pass');
        }

        return true;
      },

      // Cambio de dependienta sin login (solo seleccionar el usuario activo).
      setActiveUser: (user) => set({ currentUser: user }),

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, loginError: null });
      },

      clearError: () => set({ loginError: null }),

      isAdmin: () => get().currentUser?.rol === 'administrador',

      // Gestión de usuarios (solo admin)
      getUsers: () => loadUsers(),

      createUser: (userData) => {
        const users = loadUsers();
        const newUser = {
          ...userData,
          id: Date.now(),
          estado: true,
          fecha_creacion: new Date().toISOString(),
        };
        const updated = [...users, newUser];
        saveUsers(updated);
        return newUser;
      },

      updateUser: (id, data) => {
        const users = loadUsers();
        const updated = users.map(u => u.id === id ? { ...u, ...data } : u);
        saveUsers(updated);
      },

      toggleUserStatus: (id) => {
        const users = loadUsers();
        const updated = users.map(u =>
          u.id === id ? { ...u, estado: !u.estado } : u
        );
        saveUsers(updated);
      },

      getSavedUsername: () => localStorage.getItem('tpv_remember_user') || '',
      getSavedPassword: () => localStorage.getItem('tpv_remember_pass') || '',
    }),
    {
      name: 'tpv_auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
