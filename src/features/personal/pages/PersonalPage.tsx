import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Clock,
  Briefcase,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import { personalService } from '../services/personalService';
import type { PersonalMember, Shift, AttendanceRecord } from '../types/personal.types';
import { PersonalTable } from '../components/PersonalTable';
import { AdminShiftsPage } from './AdminShiftsPage';
import { AdminAttendancePage } from './AdminAttendancePage';
import { AddPersonalModal } from '../components/AddPersonalModal';
import { ManageAccessModal } from '../components/ManageAccessModal';
import { notificationService } from '../../../services/notificationService';

export const PersonalPage = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'shifts' | 'attendance'>('personal');
  const [members, setMembers] = useState<PersonalMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accessMember, setAccessMember] = useState<PersonalMember | null>(null);

  const loadData = useCallback(() => {
    personalService
      .getPersonalList({
        search,
        area: areaFilter,
        contractType: contractFilter,
        status: statusFilter,
      })
      .then(setMembers);

    personalService.getShifts().then(setShifts);
    personalService.getAttendance().then(setAttendance);
  }, [search, areaFilter, contractFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (member: PersonalMember) => {
    const nextStatus = member.status === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    await personalService.updateStatus(member.id, nextStatus);
    notificationService.showToast(
      `${member.firstName} ${member.lastName} ahora está ${nextStatus}`,
      nextStatus === 'ACTIVO' ? 'success' : 'info'
    );
    loadData();
  };

  // KPIs
  const totalActive = members.filter((m) => m.status === 'ACTIVO').length;
  const totalGateAccess = members.filter(
    (m) => m.systemAccess?.enabled && (m.systemAccess.role === 'PORTERÍA' || m.systemAccess.role === 'SEGURIDAD')
  ).length;
  const totalContractors = members.filter((m) => m.contractType !== 'Empleado').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-[var(--tenant-primary)]" />
            Personal de la Comunidad
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Administración de colaboradores, control de turnos, asistencia y cuentas de acceso a Portería.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" />
          Agregar Personal
        </button>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Total Colaboradores</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{members.length}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Personal Activo</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{totalActive}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Acceso a Portería</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">{totalGateAccess}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Briefcase className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Contratistas / Ext.</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{totalContractors}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Personal ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'shifts'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Turnos ({shifts.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Asistencia & Minuta ({attendance.length})
        </button>
      </div>

      {/* Tab 1: Personal Directory */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {/* Filters bar */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cédula, cargo o empresa..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Todas las Áreas</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Portería">Portería</option>
                <option value="Administración">Administración</option>
                <option value="Aseo">Aseo</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Jardinería">Jardinería</option>
              </select>

              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Todo Tipo Vinculación</option>
                <option value="Empleado">Empleado Directo</option>
                <option value="Contratista">Contratista</option>
                <option value="Proveedor">Proveedor</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="SUSPENDIDO">Suspendidos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>
          </div>

          <PersonalTable
            members={members}
            onToggleStatus={handleToggleStatus}
            onManageAccess={(m) => setAccessMember(m)}
          />
        </div>
      )}

      {/* Tab 2: Shifts Schedule & Cobertura */}
      {activeTab === 'shifts' && <AdminShiftsPage />}

      {/* Tab 3: Attendance Log & Minuta */}
      {activeTab === 'attendance' && <AdminAttendancePage />}

      {/* Modals */}
      <AddPersonalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />

      <ManageAccessModal
        member={accessMember}
        isOpen={!!accessMember}
        onClose={() => setAccessMember(null)}
        onSuccess={loadData}
      />
    </div>
  );
};
