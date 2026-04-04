import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { patientsAPI } from '@/api/patients';
import type { Patient, CreatePatientRequest } from '@/types/patient';
import {
  Activity, LogOut, ArrowLeft, Plus, Search, Pencil, UserX, X,
  Calendar, Phone, FileText, Baby,
} from 'lucide-react';

// ── Formulario de paciente ────────────────────────────────────────────────────
interface PatientFormProps {
  patient?: Patient;
  onClose: () => void;
  onSave: (data: CreatePatientRequest & { id?: number }) => void;
  loading: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({ patient, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    first_name:             patient?.first_name             ?? '',
    last_name:              patient?.last_name              ?? '',
    date_of_birth:          patient?.date_of_birth?.slice(0, 10) ?? '',
    medical_record_number:  (patient as any)?.medical_record_number ?? '',
    phone:                  patient?.phone                  ?? '',
    address:                patient?.address                ?? '',
    gestational_age_weeks:  String((patient as any)?.gestational_age_weeks ?? ''),
    gravidity:              String((patient as any)?.gravidity ?? ''),
    parity:                 String((patient as any)?.parity ?? ''),
    expected_due_date:      (patient as any)?.expected_due_date?.slice(0, 10) ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toISO = (d: string) => d ? `${d}T00:00:00` : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      first_name:            form.first_name,
      last_name:             form.last_name,
      date_of_birth:         toISO(form.date_of_birth),
      medical_record_number: form.medical_record_number || undefined,
      phone:                 form.phone || undefined,
      address:               form.address || undefined,
      gestational_age_weeks: form.gestational_age_weeks ? parseInt(form.gestational_age_weeks) : undefined,
      gravidity:             form.gravidity ? parseInt(form.gravidity) : undefined,
      parity:                form.parity ? parseInt(form.parity) : undefined,
      expected_due_date:     toISO(form.expected_due_date),
    };
    if (patient) payload.id = patient.id;
    onSave(payload);
  };

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-[#5a6272] mb-1">
        {label}{required && <span className="text-[#c4848c] ml-0.5">*</span>}
      </label>
      <input
        required={required}
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-[#e8e2d9] z-10">
          <h2 className="text-lg font-bold" style={{ color: '#2e3440' }}>
            {patient ? 'Editar paciente' : 'Nueva paciente'}
          </h2>
          <button onClick={onClose} className="text-[#8e96a3] hover:text-[#5a6272]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-[#8e96a3] uppercase tracking-wide mb-3">
              Datos personales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Nombre', 'first_name', 'text', true)}
              {field('Apellido', 'last_name', 'text', true)}
              {field('Fecha de nacimiento', 'date_of_birth', 'date', true)}
              {field('N° Historia clínica', 'medical_record_number')}
              {field('Teléfono', 'phone', 'tel')}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#5a6272] mb-1">Dirección</label>
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className="w-full border border-[#e8e2d9] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#8e96a3] uppercase tracking-wide mb-3">
              Datos obstétricos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Semanas de gestación', 'gestational_age_weeks', 'number')}
              {field('Fecha probable de parto', 'expected_due_date', 'date')}
              {field('Gravidez (# embarazos)', 'gravidity', 'number')}
              {field('Paridad (# partos)', 'parity', 'number')}
            </div>
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
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
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#6a9e8a', color: '#ffffff' }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── PatientCard ───────────────────────────────────────────────────────────────
interface PatientCardProps {
  patient: Patient & { gestational_age_weeks?: number; expected_due_date?: string; gravidity?: number; parity?: number };
  onEdit: () => void;
  onDeactivate: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onEdit, onDeactivate }) => (
  <div className="bg-white rounded-xl shadow-sm border border-[#e8e2d9] p-5 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-base" style={{ color: '#2e3440' }}>
          {patient.first_name} {patient.last_name}
        </h3>
        {(patient as any).medical_record_number && (
          <p className="text-xs text-[#8e96a3] flex items-center gap-1 mt-0.5">
            <FileText className="w-3 h-3" />
            HC: {(patient as any).medical_record_number}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 text-[#8e96a3] hover:text-[#6a9e8a] hover:bg-[#e8f2ee] rounded-lg transition-colors"
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDeactivate}
          className="p-1.5 text-[#8e96a3] hover:text-[#c4848c] hover:bg-[#f9eced] rounded-lg transition-colors"
          title="Desactivar"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-sm text-[#5a6272]">
      {patient.date_of_birth && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#8e96a3] flex-shrink-0" />
          <span>{new Date(patient.date_of_birth).toLocaleDateString('es-BO')}</span>
        </div>
      )}
      {patient.phone && (
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-[#8e96a3] flex-shrink-0" />
          <span>{patient.phone}</span>
        </div>
      )}
      {patient.gestational_age_weeks != null && (
        <div className="flex items-center gap-1.5">
          <Baby className="w-3.5 h-3.5 text-[#c4848c] flex-shrink-0" />
          <span>{patient.gestational_age_weeks} semanas</span>
        </div>
      )}
      {patient.expected_due_date && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#c4848c] flex-shrink-0" />
          <span>FPP: {new Date(patient.expected_due_date).toLocaleDateString('es-BO')}</span>
        </div>
      )}
    </div>

    {(patient.gravidity != null || patient.parity != null) && (
      <div className="mt-2 text-xs text-[#8e96a3]">
        G{patient.gravidity ?? '?'} P{patient.parity ?? '?'}
      </div>
    )}
  </div>
);

// ── PatientsPage ──────────────────────────────────────────────────────────────
export const PatientsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | Patient | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: patientsAPI.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setModal(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePatientRequest> }) =>
      patientsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); setModal(null); },
  });

  const deactivateMutation = useMutation({
    mutationFn: patientsAPI.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const handleSave = (payload: CreatePatientRequest & { id?: number }) => {
    if (payload.id) {
      const { id, ...data } = payload;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(payload as CreatePatientRequest);
    }
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      ((p as any).medical_record_number ?? '').toLowerCase().includes(q)
    );
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      {/* Navbar */}
      <nav style={{ background: "#ffffff", borderBottom: "1px solid #e8e2d9" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-7 h-7" style={{ color: '#6a9e8a' }} />
              <h1 className="text-lg font-bold" style={{ color: '#2e3440' }}>MOMI — Pacientes</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm hidden sm:block" style={{ color: '#8e96a3' }}>
                {user?.full_name || user?.username}
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: '#5a6272' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: '#5a6272' }}
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barra de acciones */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8e96a3]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o historia clínica..."
              className="w-full pl-9 pr-4 py-2 border border-[#e8e2d9] rounded-lg text-sm focus:ring-2 focus:ring-[#6a9e8a] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
            style={{ background: '#6a9e8a' }}
          >
            <Plus className="w-4 h-4" />
            Nueva paciente
          </button>
        </div>

        {/* Contador */}
        <p className="text-sm text-[#8e96a3] mb-4">
          {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
          {search && ` · búsqueda: "${search}"`}
        </p>

        {/* Grid de pacientes */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-36">
                <div className="h-4 bg-[#f0ebe3] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[#f0ebe3] rounded w-1/3 mb-4" />
                <div className="h-3 bg-[#f0ebe3] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#8e96a3]">
            <Baby className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {search ? 'No se encontraron pacientes' : 'No hay pacientes registradas'}
            </p>
            {!search && (
              <button
                onClick={() => setModal('create')}
                className="mt-3 text-sm hover:underline"
                style={{ color: '#6a9e8a' }}
              >
                Registrar primera paciente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <PatientCard
                key={p.id}
                patient={p as any}
                onEdit={() => setModal(p)}
                onDeactivate={() => {
                  if (confirm(`¿Desactivar a ${p.first_name} ${p.last_name}?`))
                    deactivateMutation.mutate(p.id);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal !== null && (
        <PatientForm
          patient={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          loading={isSaving}
        />
      )}
    </div>
  );
};
