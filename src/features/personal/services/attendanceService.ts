import type { AttendanceRecord, AttendanceStatus, TodayAttendanceKpis } from '../types/personal.types';
import { shiftService } from './shiftService';

const STORAGE_KEY_ATTENDANCE = 'havita_community_attendance';
const TODAY_STR = '2026-09-14';

function loadStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('havita_attendance_changed', { detail: data }));
  } catch (err) {
    console.error('Error saving attendance to storage:', err);
  }
}

class AttendanceService {
  private records: AttendanceRecord[] = loadStorage(STORAGE_KEY_ATTENDANCE, []);

  private reloadFromStorage(): void {
    this.records = loadStorage(STORAGE_KEY_ATTENDANCE, []);
  }

  async getAllRecords(filters?: {
    date?: string;
    memberId?: string;
    area?: string;
    status?: string;
    gate?: string;
    search?: string;
  }): Promise<AttendanceRecord[]> {
    this.reloadFromStorage();
    let list = [...this.records];

    if (filters?.date) {
      list = list.filter((r) => r.date === filters.date);
    }
    if (filters?.memberId && filters.memberId !== 'ALL') {
      list = list.filter((r) => r.memberId === filters.memberId);
    }
    if (filters?.area && filters.area !== 'ALL') {
      list = list.filter((r) => r.area === filters.area);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters?.gate && filters.gate !== 'ALL') {
      list = list.filter((r) => r.gate === filters.gate);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.memberName.toLowerCase().includes(q) ||
          r.position.toLowerCase().includes(q) ||
          (r.gate && r.gate.toLowerCase().includes(q))
      );
    }

    return list;
  }

  /**
   * Obtiene el historial de marcaciones del guarda actual ("Mis marcaciones")
   */
  async getMyAttendance(memberId: string): Promise<AttendanceRecord[]> {
    this.reloadFromStorage();
    return this.records.filter((r) => r.memberId === memberId);
  }

  /**
   * Obtiene la marcación activa o de hoy para un turno específico
   */
  async getRecordForShift(shiftId: string, memberId: string): Promise<AttendanceRecord | undefined> {
    this.reloadFromStorage();
    return this.records.find((r) => r.shiftId === shiftId && r.memberId === memberId);
  }

  /**
   * Marcar ENTRADA (desde Portería)
   */
  async clockIn(params: {
    shiftId: string;
    memberId: string;
    actualTime: string; // ej: "05:57"
    isLate?: boolean;
    observations?: string;
  }): Promise<AttendanceRecord> {
    this.reloadFromStorage();

    const shift = await shiftService.getShiftById(params.shiftId);
    const member = undefined as { firstName?: string; lastName?: string; position?: string; area?: string } | undefined;

    const scheduledStart = shift?.startTime || '06:00';
    const scheduledEnd = shift?.endTime || '18:00';
    const gate = shift?.gate || 'Portería principal';

    // Determinar estatus: si la hora real es mayor al horario programado + 5 min -> TARDANZA
    const isLate =
      params.isLate ??
      (params.actualTime > scheduledStart &&
        this.diffInMinutes(scheduledStart, params.actualTime) > 5);

    const status: AttendanceStatus = isLate ? 'TARDANZA' : 'PRESENTE';

    // Buscar si ya existe registro para este turno
    const existingIndex = this.records.findIndex(
      (r) => r.shiftId === params.shiftId && r.memberId === params.memberId
    );

    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? this.records[existingIndex].id : `att-${Date.now()}`,
      tenantId: 'tenant-limonar',
      shiftId: params.shiftId,
      memberId: params.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : shift?.memberName || 'Carlos Rodríguez',
      position: member?.position || 'Guarda de seguridad',
      area: (member?.area || 'Seguridad') as any,
      date: shift?.date || TODAY_STR,
      scheduledCheckIn: scheduledStart,
      checkIn: params.actualTime,
      scheduledCheckOut: scheduledEnd,
      gate: typeof gate === 'string' ? gate : 'Portería principal',
      status,
      observations:
        params.observations ||
        (isLate
          ? `Ingreso tardío registrado a las ${params.actualTime}.`
          : `Ingreso puntual verificado en puesto de control.`),
    };

    if (existingIndex >= 0) {
      this.records[existingIndex] = record;
    } else {
      this.records.unshift(record);
    }

    saveStorage(STORAGE_KEY_ATTENDANCE, this.records);

    // Actualizar el turno en shiftService
    await shiftService.updateShiftCheckTimes(params.shiftId, params.actualTime, undefined);

    return record;
  }

  /**
   * Marcar SALIDA (desde Portería)
   */
  async clockOut(params: {
    shiftId: string;
    memberId: string;
    actualTime: string; // ej: "18:03"
    observations?: string;
  }): Promise<AttendanceRecord | null> {
    this.reloadFromStorage();

    const index = this.records.findIndex(
      (r) => r.shiftId === params.shiftId && r.memberId === params.memberId
    );

    if (index === -1) {
      // Fallback si no había marcado entrada formalmente
      const shift = await shiftService.getShiftById(params.shiftId);
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        tenantId: 'tenant-limonar',
        shiftId: params.shiftId,
        memberId: params.memberId,
        memberName: shift?.memberName || 'Carlos Rodríguez',
        position: shift?.memberPosition || 'Guarda de seguridad',
        area: (shift?.area || 'Seguridad') as any,
        date: shift?.date || TODAY_STR,
        scheduledCheckIn: shift?.startTime || '06:00',
        checkIn: shift?.actualCheckIn || '06:00',
        scheduledCheckOut: shift?.endTime || '18:00',
        checkOut: params.actualTime,
        gate: typeof shift?.gate === 'string' ? shift.gate : 'Portería principal',
        status: 'PRESENTE',
        observations: params.observations || 'Salida registrada correctamente.',
      };
      this.records.unshift(newRecord);
      saveStorage(STORAGE_KEY_ATTENDANCE, this.records);
      await shiftService.updateShiftCheckTimes(params.shiftId, undefined, params.actualTime);
      return newRecord;
    }

    this.records[index] = {
      ...this.records[index],
      checkOut: params.actualTime,
      observations:
        params.observations ||
        `${this.records[index].observations || ''} · Salida completada a las ${params.actualTime}.`.trim(),
    };

    saveStorage(STORAGE_KEY_ATTENDANCE, this.records);

    // Actualizar el turno a COMPLETADO
    await shiftService.updateShiftCheckTimes(params.shiftId, undefined, params.actualTime);

    return this.records[index];
  }

  /**
   * Obtiene los KPIs de asistencia de hoy para el Dashboard y para la vista de Asistencia
   * Según Requerimiento 21:
   * TURNOS DE HOY: 12
   * PRESENTES: 10
   * PENDIENTES: 1
   * AUSENTES: 1
   */
  async getTodayAttendanceKpis(): Promise<TodayAttendanceKpis> {
    this.reloadFromStorage();
    const todayRecords = this.records.filter((r) => r.date === TODAY_STR);

    const presentCount = todayRecords.filter((r) => r.status === 'PRESENTE' || r.status === 'TARDANZA').length;
    const absentCount = todayRecords.filter((r) => r.status === 'AUSENTE').length;
    
    // We would ideally fetch all shifts scheduled for today from shiftService
    // to calculate pending vs total. For now, since we only have attendance records:
    const totalTodayShifts = todayRecords.length;
    const pendingCount = 0;

    return {
      totalTodayShifts,
      presentCount,
      pendingCount,
      absentCount,
    };
  }

  private diffInMinutes(start: string, end: string): number {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    } catch {
      return 0;
    }
  }

  /**
   * Restablecer datos iniciales para pruebas
   */
  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEY_ATTENDANCE);
    this.records = [];
    saveStorage(STORAGE_KEY_ATTENDANCE, this.records);
  }
}

export const attendanceService = new AttendanceService();
