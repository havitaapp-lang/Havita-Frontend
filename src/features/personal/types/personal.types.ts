// Types for Personal y Usuarios de la Unidad Residencial

export type PersonalArea =
  | 'Seguridad'
  | 'Portería'
  | 'Administración'
  | 'Aseo'
  | 'MAINTENANCE'
  | 'Jardinería'
  | 'Servicios generales'
  | 'Otro';

export type ContractType = 'Empleado' | 'Contratista' | 'Proveedor';

export type PersonalStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'FINALIZADO';

import type { Role } from '../../../types';

export type SystemRole = Role | 'PORTERÍA' | 'SEGURIDAD' | 'ADMINISTRADOR' | 'MANTENIMIENTO' | 'SOLO_LECTURA';

export type GateAssignment =
  | 'Portería principal'
  | 'Portería secundaria'
  | 'Todas las porterías';

export type ShiftStatus =
  | 'PROGRAMADO'
  | 'EN_CURSO'
  | 'COMPLETADO'
  | 'AUSENTE'
  | 'CANCELADO';

export type ShiftType = 'Normal' | 'Especial' | 'Relevo' | 'Refuerzo';

export type AttendanceStatus =
  | 'PRESENTE'
  | 'TARDANZA'
  | 'AUSENTE'
  | 'INCOMPLETO';

export type CoverageStatus = 'CUBIERTO' | 'PENDIENTE' | 'SIN_COBERTURA';

export interface SystemAccess {
  enabled: boolean;
  username: string; // Puede ser el correo o nombre para retrocompatibilidad
  loginEmail?: string;
  password?: string;
  role: SystemRole;
  status: 'ACTIVO' | 'INACTIVO';
  assignedGate?: GateAssignment;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface CurrentShift {
  name: string;
  schedule: string; // ej: "06:00 - 18:00"
  days: string; // ej: "Lun - Sáb"
  gate?: string;
}

export interface PersonalMember {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  documentType: 'CC' | 'CE' | 'PASAPORTE' | 'PEP';
  documentNumber: string;
  phone: string;
  email: string;
  position: string; // Cargo, ej: "Guarda de seguridad"
  area: PersonalArea;
  contractType: ContractType;
  company?: string; // Nombre de empresa proveedora si aplica
  startDate: string; // YYYY-MM-DD
  status: PersonalStatus;
  currentShift?: CurrentShift;
  lastAccessAt?: string;
  systemAccess?: SystemAccess;
  avatar?: string;
  observations?: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  date?: string; // YYYY-MM-DD
  memberId: string;
  memberName: string;
  memberPosition: string;
  area: PersonalArea;
  shiftName: string;
  startTime: string; // HH:mm (ej: "06:00")
  endTime: string; // HH:mm (ej: "18:00")
  gate?: GateAssignment | string;
  shiftType?: ShiftType;
  daysOfWeek?: string[]; // ["Lunes", "Martes", ...]
  status: ShiftStatus;
  notes?: string;
  actualCheckIn?: string; // HH:mm
  actualCheckOut?: string; // HH:mm
  isRecurrent?: boolean;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  shiftId?: string;
  memberId: string;
  memberName: string;
  position: string;
  area: PersonalArea;
  date: string; // YYYY-MM-DD
  scheduledCheckIn?: string; // HH:mm (ej: "06:00")
  checkIn?: string; // HH:mm (ej: "05:57")
  scheduledCheckOut?: string; // HH:mm (ej: "18:00")
  checkOut?: string; // HH:mm (ej: "18:03")
  gate?: string;
  status: AttendanceStatus;
  observations?: string;
}

export interface GateCoverageSlot {
  gate: string;
  timeRange: string; // ej: "06:00 AM — 06:00 PM"
  rawStartTime: string;
  rawEndTime: string;
  shiftId?: string;
  guardId?: string;
  guardName?: string;
  status: CoverageStatus;
  checkInStatus?: 'MARCADA' | 'PENDIENTE' | 'TARDIA';
  actualCheckIn?: string;
}

export interface TodayAttendanceKpis {
  totalTodayShifts: number;
  presentCount: number;
  pendingCount: number;
  absentCount: number;
}
