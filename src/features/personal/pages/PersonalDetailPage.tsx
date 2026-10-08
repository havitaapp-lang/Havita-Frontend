import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Briefcase,
  KeyRound,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Building,
} from 'lucide-react';
import { personalService } from '../services/personalService';
import type { PersonalMember, Shift, AttendanceRecord } from '../types/personal.types';
import { ManageAccessModal } from '../components/ManageAccessModal';
import { notificationService } from '../../../services/notificationService';

export const PersonalDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<PersonalMember | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const loadData = useCallback(() => {
    if (!id) return;
    personalService.getPersonalById(id).then((m) => {
      if (m) setMember({ ...m });
    });

    personalService.getShifts().then((allShifts) => {
      setShifts(allShifts.filter((s) => s.memberId === id));
    });

    personalService.getAttendance().then((allAtt) => {
      setAttendance(allAtt.filter((a) => a.memberId === id));
    });
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!member) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <p className="font-bold text-slate-800 text-sm">Colaborador no encontrado</p>
        <button
          onClick={() => navigate('/admin/personal')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
        >
          Volver al directorio
        </button>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    const nextStatus = member.status === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    await personalService.updateStatus(member.id, nextStatus);
    notificationService.showToast(
      `Estado actualizado a ${nextStatus}`,
      nextStatus === 'ACTIVO' ? 'success' : 'info'
    );
    loadData();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/personal')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado de Personal
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAccessModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            Gestionar Acceso
          </button>

          <button
            onClick={handleToggleStatus}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              member.status === 'ACTIVO'
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            {member.status === 'ACTIVO' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Suspender
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Reactivar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={
              member.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={member.firstName}
            className="w-16 h-16 rounded-2xl object-cover bg-slate-100 ring-4 ring-slate-100 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {member.firstName} {member.lastName}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  member.status === 'ACTIVO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {member.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">
              {member.position} · <span className="text-[var(--tenant-primary)] font-semibold">{member.area}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span className="font-mono">
                {member.documentType} {member.documentNumber}
              </span>
              <span>•</span>
              <span>Ingreso: {member.startDate}</span>
            </p>
          </div>
        </div>

        {/* Access Quick Badge */}
        {member.systemAccess?.enabled ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-emerald-600" />
              Cuenta de Sistema Activa
            </span>
            <div className="font-black text-emerald-950 flex items-center gap-1.5">
              <span>Rol: {member.systemAccess.role}</span>
              {member.systemAccess.assignedGate && (
                <span className="text-blue-700 font-semibold">• {member.systemAccess.assignedGate}</span>
              )}
            </div>
            <p className="text-[11px] font-mono text-emerald-700">Usuario: @{member.systemAccess.username}</p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
            <p className="font-bold text-slate-700">Sin cuenta de acceso</p>
            <p className="text-[11px] text-slate-400">Solo registro laboral y turnos</p>
          </div>
        )}
      </div>

      {/* Portería Specific Integration Card (Crucial Requirement) */}
      {member.systemAccess?.enabled && member.systemAccess.role === 'PORTERÍA' && (
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Acceso a módulo de Portería
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Puesto Asignado: {member.systemAccess.assignedGate || 'Portería principal'}
            </h3>
            <p className="text-xs text-slate-300">
              Este colaborador puede ingresar directamente a la consola de control de accesos, paquetería y libro de minuta.
            </p>
          </div>

          <Link
            to="/security"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            Abrir Vista Portería
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 2 Column Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Card 1: Personal & Contact Info */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-[var(--tenant-primary)]" />
            Información Personal y Contacto
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block text-[10px]">Tipo de Documento</span>
              <span className="font-bold text-slate-800">{member.documentType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Número de Identificación</span>
              <span className="font-mono font-bold text-slate-800">{member.documentNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Teléfono Celular</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                {member.phone || 'No registrado'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Correo Electrónico</span>
              <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                {member.email || 'No registrado'}
              </span>
            </div>
          </div>

          {member.observations && (
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block text-[10px] font-bold mb-1">Notas Administrativas</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">{member.observations}</p>
            </div>
          )}
        </div>

        {/* Card 2: Laboral & Contract Info */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Briefcase className="w-4 h-4 text-purple-600" />
            Información Laboral & Turno Actual
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block text-[10px]">Cargo</span>
              <span className="font-bold text-slate-800">{member.position}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Área Asignada</span>
              <span className="font-bold text-slate-800">{member.area}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Tipo de Contratación</span>
              <span className="font-bold text-purple-700">{member.contractType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Empresa / Proveedor</span>
              <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                <Building className="w-3 h-3 text-slate-400" />
                {member.company || 'Contratación directa'}
              </span>
            </div>
          </div>

          {member.currentShift ? (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-900 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                Turno Asignado
              </span>
              <p className="font-bold text-slate-900 text-xs">{member.currentShift.name}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span>Horario: <strong className="font-mono">{member.currentShift.schedule}</strong></span>
                <span>Días: <strong>{member.currentShift.days}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 text-center">
              Sin turno programado actualmente
            </div>
          )}
        </div>
      </div>

      {/* Shifts & Attendance Section */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Turnos & Registro Operativo Reciente
          </h3>
          <span className="text-xs text-slate-500 font-medium">Último acceso: {member.lastAccessAt || 'Hoy'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shifts */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Programación de Turnos</h4>
            {shifts.length > 0 ? (
              shifts.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.shiftName}</p>
                    <p className="text-[11px] font-mono text-slate-500">{s.startTime} - {s.endTime}</p>
                    {s.gate && <p className="text-[10px] text-emerald-700 font-semibold">{s.gate}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {s.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No hay otros turnos programados.</p>
            )}
          </div>

          {/* Attendance History */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Últimas Marcaciones</h4>
            {attendance.length > 0 ? (
              attendance.map((att) => (
                <div key={att.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{att.date}</span>
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      Entrada: {att.checkIn} {att.checkOut ? `• Salida: ${att.checkOut}` : '• (En turno)'}
                    </p>
                    {att.gate && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {att.gate}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {att.status === 'PRESENTE' ? 'A tiempo' : att.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Sin registros de asistencia previos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Manage Access Modal */}
      <ManageAccessModal
        member={member}
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
