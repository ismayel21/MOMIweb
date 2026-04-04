import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { adminAPI, type AdminUser, type CreateUserRequest } from '@/api/admin';
import {
  Shield, LogOut, Plus, Pencil, UserX, UserCheck, X, Eye, EyeOff,
} from 'lucide-react';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:   { label: 'Admin',    color: 'bg-[#f0edf9] text-[#6b5fa0]' },
  doctor:  { label: 'Doctor',   color: 'bg-[#e8f2ee] text-[#4d7d6c]' },
  tecnico: { label: 'Técnico',  color: 'bg-[#f9eced] text-[#a06068]' },
};

// ── Modal de crear/editar usuario ─────────────────────────────────────────────
interface UserModalProps {
  user?: AdminUser;
  onClose: () => void;
  onSave: (data: CreateUserRequest & { id?: number }) => void;
  loading: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    username:  user?.username  ?? '',
    email:     user?.email     ?? '',
    full_name: user?.full_name ?? '',
    password:  '',
    role:      user?.role      ?? 'doctor',
  });
  const [showPwd, setShowPwd] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateUserRequest & { id?: number } = {
      username:  form.username,
      email:     form.email,
      full_name: form.full_name || undefined,
      password:  form.password,
      role:      form.role,
    };
    if (user) payload.id = user.id;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#2e3440' }}>
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-[#8e96a3] hover:text-[#5a6272]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div>
              <label className="block text-sm font-medium text-[#5a6272] mb-1">Usuario</label>
              <input
                required
                value={form.username}
                onChange={e => set('username', e.target.value)}
                className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#5a6272] mb-1">Nombre completo</label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a6272] mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a6272] mb-1">Rol</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            >
              <option value="doctor">Doctor</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a6272] mb-1">
              {user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <div className="relative">
              <input
                required={!user}
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                className="absolute right-2 top-2 text-[#8e96a3] hover:text-[#5a6272]"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#e8e2d9] text-[#5a6272] rounded-lg text-sm hover:bg-[#f4f1ec] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#9b8ec4' }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── AdminPage ─────────────────────────────────────────────────────────────────
export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminAPI.listUsers,
  });

  const createMutation = useMutation({
    mutationFn: adminAPI.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminAPI.updateUser>[1] }) =>
      adminAPI.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
  });

  const deactivateMutation = useMutation({
    mutationFn: adminAPI.deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleSave = (payload: Parameters<typeof createMutation.mutate>[0] & { id?: number }) => {
    if (payload.id) {
      const { id, username: _u, ...data } = payload as any;
      if (!data.password) delete data.password;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (u: AdminUser) => {
    updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen" style={{ background: '#faf8f5' }}>
      {/* Navbar */}
      <nav style={{ background: '#9b8ec4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7" style={{ color: '#f0edf9' }} />
              <span className="text-lg font-bold text-white">MOMI — Panel Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: '#f0edf9' }}>{user?.full_name || user?.username}</span>
              <button onClick={logout} className="flex items-center gap-1 text-sm transition-colors" style={{ color: '#f0edf9' }}>
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-[#e8e2d9]">
          {/* Cabecera */}
          <div className="flex justify-between items-center p-6 border-b border-[#e8e2d9]">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#2e3440' }}>Gestión de Usuarios</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8e96a3' }}>
                {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setModal('create')}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
              style={{ background: '#9b8ec4' }}
            >
              <Plus className="w-4 h-4" />
              Nuevo usuario
            </button>
          </div>

          {/* Tabla */}
          {isLoading ? (
            <div className="p-12 text-center text-[#8e96a3]">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f1ec] text-[#8e96a3] uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Usuario</th>
                    <th className="px-6 py-3 text-left">Nombre</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Rol</th>
                    <th className="px-6 py-3 text-left">Estado</th>
                    <th className="px-6 py-3 text-left">Creado</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe3]">
                  {users.map(u => {
                    const roleInfo = ROLE_LABELS[u.role] ?? { label: u.role, color: 'bg-[#f4f1ec] text-[#5a6272]' };
                    return (
                      <tr key={u.id} className={`transition-colors ${!u.is_active ? 'opacity-50' : ''}`}
                        style={{ background: 'white' }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#faf8f5'}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'white'}
                      >
                        <td className="px-6 py-4 font-medium" style={{ color: '#2e3440' }}>@{u.username}</td>
                        <td className="px-6 py-4" style={{ color: '#5a6272' }}>{u.full_name || '—'}</td>
                        <td className="px-6 py-4" style={{ color: '#5a6272' }}>{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-[#e8f2ee] text-[#4d7d6c]' : 'bg-[#f9eced] text-[#a06068]'}`}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ color: '#8e96a3' }}>
                          {new Date(u.created_at).toLocaleDateString('es-BO')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setModal(u)}
                              title="Editar"
                              className="p-1.5 text-[#8e96a3] hover:text-[#6a9e8a] hover:bg-[#e8f2ee] rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleActive(u)}
                              title={u.is_active ? 'Desactivar' : 'Activar'}
                              className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-[#8e96a3] hover:text-[#c4848c] hover:bg-[#f9eced]' : 'text-[#8e96a3] hover:text-[#4d7d6c] hover:bg-[#e8f2ee]'}`}
                            >
                              {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modal !== null && (
        <UserModal
          user={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          loading={isSaving}
        />
      )}
    </div>
  );
};
