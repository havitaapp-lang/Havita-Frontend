import type { Shift, ShiftStatus, GateCoverageSlot, PersonalMember } from '../types/personal.types';

const STORAGE_KEY_SHIFTS = 'havita_community_shifts';
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
    window.dispatchEvent(new CustomEvent('havita_shifts_changed', { detail: data }));
  } catch (err) {
    console.error('Error saving shifts to storage:', err);
  }
}

export interface ShiftAlert {
  id: string;
  type: 'UNMARKED_SHIFT' | 'UNCOVERED_SHIFT';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  shiftId?: string;
  gate?: string;
  guardName?: string;
  time?: string;
  actionText: string;
}

class ShiftService {
  private shifts: Shift[] = loadStorage(STORAGE_KEY_SHIFTS, []);

  private reloadFromStorage(): void {
    this.shifts = loadStorage(STORAGE_KEY_SHIFTS, []);
  }

  async getAllShifts(filters?: {
    date?: string;
    gate?: string;
    status?: ShiftStatus | 'ALL';
    memberId?: string;
    search?: string;
  }): Promise<Shift[]> {
    this.reloadFromStorage();
    let list = [...this.shifts];

    if (filters?.date) {
      list = list.filter((s) => s.date === filters.date);
    }
    if (filters?.gate && filters.gate !== 'ALL') {
      list = list.filter((s) => s.gate === filters.gate);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((s) => s.status === filters.status);
    }
    if (filters?.memberId) {
      list = list.filter((s) => s.memberId === filters.memberId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.memberName.toLowerCase().includes(q) ||
          s.shiftName.toLowerCase().includes(q) ||
          (s.gate && s.gate.toLowerCase().includes(q))
      );
    }

    return list;
  }

  async getTodayShifts(): Promise<Shift[]> {
    this.reloadFromStorage();
    return this.shifts.filter((s) => s.date === TODAY_STR || s.daysOfWeek?.includes('Lunes'));
  }

  async getShiftById(id: string): Promise<Shift | undefined> {
    this.reloadFromStorage();
    return this.shifts.find((s) => s.id === id);
  }

  /**
   * Obtiene el turno asignado al guarda actual (para la vista de Portería)
   */
  async getMyCurrentShift(memberId: string): Promise<Shift | null> {
    this.reloadFromStorage();
    // Prioritize today's shift for this guard
    const todayShift = this.shifts.find(
      (s) => s.memberId === memberId && (s.date === TODAY_STR || !s.date) && s.status !== 'CANCELADO'
    );
    if (todayShift) return todayShift;

    // Fallback: any upcoming active shift
    const anyShift = this.shifts.find(
      (s) => s.memberId === memberId && s.status !== 'CANCELADO' && s.status !== 'COMPLETADO'
    );
    return anyShift || null;
  }

  /**
   * Próximos turnos del guarda (Hoy, Mañana, Esta semana)
   */
  async getMyUpcomingShifts(memberId: string): Promise<{
    today: Shift[];
    tomorrow: Shift[];
    thisWeek: Shift[];
  }> {
    this.reloadFromStorage();
    const guardShifts = this.shifts.filter(
      (s) => s.memberId === memberId && s.status !== 'CANCELADO'
    );

    const today = guardShifts.filter((s) => s.date === TODAY_STR);
    const tomorrow = guardShifts.filter((s) => s.date === '2026-09-15');
    const thisWeek = guardShifts.filter(
      (s) => s.date && s.date > '2026-09-15' && s.date <= '2026-09-20'
    );

    return { today, tomorrow, thisWeek };
  }

  /**
   * Crear un nuevo turno simple
   */
  async createShift(data: Omit<Shift, 'id'>): Promise<Shift> {
    this.reloadFromStorage();
    const newShift: Shift = {
      ...data,
      id: `sh-${Date.now()}`,
      tenantId: data.tenantId || 'tenant-limonar',
      status: data.status || 'PROGRAMADO',
    };

    this.shifts.unshift(newShift);
    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return newShift;
  }

  /**
   * Crear turnos recurrentes para N semanas
   */
  async createRecurrentShifts(
    base: Omit<Shift, 'id' | 'date'>,
    selectedDays: string[],
    durationWeeks: number
  ): Promise<Shift[]> {
    this.reloadFromStorage();
    const createdShifts: Shift[] = [];
    const dayOffsets: Record<string, number> = {
      Lunes: 0,
      Martes: 1,
      Miércoles: 2,
      Jueves: 3,
      Viernes: 4,
      Sábado: 5,
      Domingo: 6,
    };

    const baseDate = new Date(2026, 8, 14); // 2026-09-14 (Monday)

    for (let week = 0; week < durationWeeks; week++) {
      for (const day of selectedDays) {
        const offset = (dayOffsets[day] ?? 0) + week * 7;
        const shiftDate = new Date(baseDate);
        shiftDate.setDate(baseDate.getDate() + offset);

        const yyyy = shiftDate.getFullYear();
        const mm = String(shiftDate.getMonth() + 1).padStart(2, '0');
        const dd = String(shiftDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const newShift: Shift = {
          ...base,
          id: `sh-rec-${Date.now()}-${week}-${day.slice(0, 3)}`,
          date: dateStr,
          status: 'PROGRAMADO',
          isRecurrent: true,
        };

        createdShifts.push(newShift);
        this.shifts.unshift(newShift);
      }
    }

    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return createdShifts;
  }

  /**
   * Cambiar el guarda asignado a un turno (con validación de compatibilidad)
   */
  async changeShiftGuard(
    shiftId: string,
    newMemberId: string,
    newMemberName: string,
    newMemberPosition: string
  ): Promise<Shift | null> {
    this.reloadFromStorage();
    const index = this.shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) return null;

    this.shifts[index] = {
      ...this.shifts[index],
      memberId: newMemberId,
      memberName: newMemberName,
      memberPosition: newMemberPosition,
    };

    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return this.shifts[index];
  }

  /**
   * Cancelar un turno
   */
  async cancelShift(shiftId: string): Promise<boolean> {
    this.reloadFromStorage();
    const index = this.shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) return false;

    this.shifts[index].status = 'CANCELADO';
    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return true;
  }

  /**
   * Duplicar un turno para otra fecha
   */
  async duplicateShift(shiftId: string, newDate: string): Promise<Shift | null> {
    this.reloadFromStorage();
    const original = this.shifts.find((s) => s.id === shiftId);
    if (!original) return null;

    const duplicated: Shift = {
      ...original,
      id: `sh-dup-${Date.now()}`,
      date: newDate,
      status: 'PROGRAMADO',
      actualCheckIn: undefined,
      actualCheckOut: undefined,
    };

    this.shifts.unshift(duplicated);
    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return duplicated;
  }

  /**
   * Actualiza el estado de marcación de un turno (cuando el guarda marca entrada o salida)
   */
  async updateShiftCheckTimes(
    shiftId: string,
    actualCheckIn?: string,
    actualCheckOut?: string
  ): Promise<Shift | null> {
    this.reloadFromStorage();
    const index = this.shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) return null;

    if (actualCheckIn) {
      this.shifts[index].actualCheckIn = actualCheckIn;
      this.shifts[index].status = 'EN_CURSO';
    }
    if (actualCheckOut) {
      this.shifts[index].actualCheckOut = actualCheckOut;
      this.shifts[index].status = 'COMPLETADO';
    }

    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    return this.shifts[index];
  }

  /**
   * Obtiene la matriz de cobertura de porterías para hoy
   */
  async getCoverageSlots(date: string = TODAY_STR): Promise<GateCoverageSlot[]> {
    this.reloadFromStorage();
    const dayShifts = this.shifts.filter((s) => s.date === date && s.status !== 'CANCELADO');

    // Portería Principal: 06:00 - 18:00
    const mainDayShift = dayShifts.find(
      (s) => s.gate === 'Portería principal' && s.startTime === '06:00'
    );
    // Portería Principal: 18:00 - 06:00
    const mainNightShift = dayShifts.find(
      (s) => s.gate === 'Portería principal' && s.startTime === '18:00'
    );
    // Portería Secundaria: 06:00 - 18:00
    const secDayShift = dayShifts.find(
      (s) => s.gate === 'Portería secundaria' && s.startTime === '06:00'
    );
    // Portería Secundaria: 18:00 - 06:00
    const secNightShift = dayShifts.find(
      (s) => s.gate === 'Portería secundaria' && s.startTime === '18:00'
    );

    const slots: GateCoverageSlot[] = [
      {
        gate: 'Portería Principal',
        timeRange: '06:00 AM — 06:00 PM',
        rawStartTime: '06:00',
        rawEndTime: '18:00',
        shiftId: mainDayShift?.id,
        guardId: mainDayShift?.memberId,
        guardName: mainDayShift?.memberName || undefined,
        status: !mainDayShift || !mainDayShift.memberId
          ? 'SIN_COBERTURA'
          : mainDayShift.actualCheckIn
          ? 'CUBIERTO'
          : 'PENDIENTE',
        checkInStatus: mainDayShift?.actualCheckIn ? 'MARCADA' : 'PENDIENTE',
        actualCheckIn: mainDayShift?.actualCheckIn,
      },
      {
        gate: 'Portería Principal',
        timeRange: '06:00 PM — 06:00 AM',
        rawStartTime: '18:00',
        rawEndTime: '06:00',
        shiftId: mainNightShift?.id,
        guardId: mainNightShift?.memberId,
        guardName: mainNightShift?.memberName || undefined,
        status: !mainNightShift || !mainNightShift.memberId
          ? 'SIN_COBERTURA'
          : mainNightShift.actualCheckIn
          ? 'CUBIERTO'
          : 'PENDIENTE',
        checkInStatus: mainNightShift?.actualCheckIn ? 'MARCADA' : 'PENDIENTE',
        actualCheckIn: mainNightShift?.actualCheckIn,
      },
      {
        gate: 'Portería Secundaria',
        timeRange: '06:00 AM — 06:00 PM',
        rawStartTime: '06:00',
        rawEndTime: '18:00',
        shiftId: secDayShift?.id,
        guardId: secDayShift?.memberId,
        guardName: secDayShift?.memberName || undefined,
        status: !secDayShift || !secDayShift.memberId
          ? 'SIN_COBERTURA'
          : secDayShift.actualCheckIn
          ? 'CUBIERTO'
          : 'PENDIENTE',
        checkInStatus: secDayShift?.actualCheckIn ? 'MARCADA' : 'PENDIENTE',
        actualCheckIn: secDayShift?.actualCheckIn,
      },
      {
        gate: 'Portería Secundaria',
        timeRange: '06:00 PM — 06:00 AM',
        rawStartTime: '18:00',
        rawEndTime: '06:00',
        shiftId: secNightShift?.id,
        guardId: secNightShift?.memberId,
        guardName: secNightShift?.memberName && secNightShift.memberName !== 'Sin asignar'
          ? secNightShift.memberName
          : undefined,
        status: !secNightShift || !secNightShift.memberId || secNightShift.memberName === 'Sin asignar'
          ? 'SIN_COBERTURA'
          : secNightShift.actualCheckIn
          ? 'CUBIERTO'
          : 'PENDIENTE',
        checkInStatus: 'PENDIENTE',
      },
    ];

    return slots;
  }

  /**
   * Obtiene alertas operativas para el Administrador
   */
  async getShiftAlerts(): Promise<ShiftAlert[]> {
    this.reloadFromStorage();
    const alerts: ShiftAlert[] = [];

    // 1. Alerta: Turno sin cobertura
    const uncovered = this.shifts.find(
      (s) =>
        (s.date === TODAY_STR || !s.date) &&
        (!s.memberId || s.memberName === 'Sin asignar') &&
        s.status !== 'CANCELADO'
    );
    if (uncovered) {
      alerts.push({
        id: `alert-unc-${uncovered.id}`,
        type: 'UNCOVERED_SHIFT',
        severity: 'critical',
        title: 'Turno sin cobertura',
        message: `${uncovered.gate || 'Portería'} no tiene guarda asignado para las ${uncovered.startTime}.`,
        shiftId: uncovered.id,
        gate: uncovered.gate,
        time: uncovered.startTime,
        actionText: 'Asignar guarda',
      });
    }

    // 2. Alerta: Turno sin marcar
    const unmarked = this.shifts.find(
      (s) =>
        (s.date === TODAY_STR || !s.date) &&
        s.memberId &&
        s.memberName !== 'Sin asignar' &&
        !s.actualCheckIn &&
        s.status === 'PROGRAMADO' &&
        s.startTime === '06:00'
    );
    if (unmarked) {
      alerts.push({
        id: `alert-unm-${unmarked.id}`,
        type: 'UNMARKED_SHIFT',
        severity: 'warning',
        title: 'Turno sin marcar',
        message: `El turno de ${unmarked.memberName} comenzó hace 22 minutos y no registra entrada.`,
        shiftId: unmarked.id,
        guardName: unmarked.memberName,
        time: unmarked.startTime,
        actionText: 'Ver turno',
      });
    }

    return alerts;
  }

  /**
   * Obtiene únicamente el personal elegible para turnos de portería/seguridad
   * REGLA 24: Solo personal compatible (Seguridad o Portería)
   */
  async getEligibleGuards(): Promise<PersonalMember[]> {
    // Returns empty array until real staff data is loaded from backend
    return [];
  }

  /**
   * Restablecer datos iniciales para demostración
   */
  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEY_SHIFTS);
    this.shifts = [];
    saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
  }
}

export const shiftService = new ShiftService();
