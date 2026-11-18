import type { Shift, ShiftStatus, GateCoverageSlot, PersonalMember, PersonalArea } from '../types/personal.types';
import { apiClient } from '../../../api/apiClient';
import { personalService } from './personalService';

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

export function getTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function backendStatusToFrontend(status: string): ShiftStatus {
  switch (status) {
    case 'SCHEDULED': return 'PROGRAMADO';
    case 'IN_PROGRESS': return 'EN_CURSO';
    case 'COMPLETED': return 'COMPLETADO';
    case 'ABSENT': return 'AUSENTE';
    case 'CANCELLED': return 'CANCELADO';
    default: return (status as ShiftStatus) || 'PROGRAMADO';
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '00:00';
  return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
}

function formatDateTimeToTime(isoStr?: string): string | undefined {
  if (!isoStr) return undefined;
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return undefined;
  }
}

class ShiftService {
  /**
   * Obtiene todos los turnos del backend, opcionalmente filtrados por fecha, portería, estado, etc.
   */
  async getAllShifts(filters?: {
    date?: string;
    gate?: string;
    status?: ShiftStatus | 'ALL';
    memberId?: string;
    search?: string;
  }): Promise<Shift[]> {
    try {
      let rawShifts: any[] = [];

      if (filters?.date) {
        const res = await apiClient.get<any[]>('/staff/shifts/by-date', { date: filters.date });
        rawShifts = Array.isArray(res) ? res : [];
      } else {
        const page = await apiClient.get<any>('/staff/shifts', { page: 0, size: 200 });
        rawShifts = page?.content || (Array.isArray(page) ? page : []);
      }

      // Fetch attendance records to correlate actual check-in / check-out times
      let attendances: any[] = [];
      try {
        if (filters?.date) {
          const attRes = await apiClient.get<any[]>('/staff/attendance/by-date', { date: filters.date });
          attendances = Array.isArray(attRes) ? attRes : [];
        } else {
          const attPage = await apiClient.get<any>('/staff/attendance', { page: 0, size: 200 });
          attendances = attPage?.content || (Array.isArray(attPage) ? attPage : []);
        }
      } catch (attErr) {
        console.warn('Could not fetch attendance for shift correlation:', attErr);
      }

      // Map backend shift responses to frontend Shift interface
      let list: Shift[] = rawShifts.map((s: any) => {
        // Find matching attendance record for actual check-in / out
        const att = attendances.find(
          (a: any) =>
            (a.shiftId && a.shiftId === s.id) ||
            (a.staffMemberId === s.staffMemberId && a.recordDate === s.shiftDate)
        );

        return {
          id: s.id,
          tenantId: s.tenantId,
          date: s.shiftDate,
          memberId: s.staffMemberId,
          memberName: s.staffMemberName || 'Sin asignar',
          memberPosition: s.staffMemberPosition || 'Guarda de seguridad',
          area: (s.area as PersonalArea) || 'Seguridad',
          shiftName: s.shiftName || 'Turno de Portería',
          startTime: formatTime(s.startTime),
          endTime: formatTime(s.endTime),
          gate: s.gate || 'Portería Principal',
          shiftType: s.shiftType || 'Normal',
          status: backendStatusToFrontend(s.status),
          notes: s.notes,
          actualCheckIn: formatDateTimeToTime(att?.checkIn),
          actualCheckOut: formatDateTimeToTime(att?.checkOut),
        };
      });

      // Apply in-memory filters
      if (filters?.gate && filters.gate !== 'ALL') {
        const gateQuery = filters.gate.toLowerCase();
        list = list.filter((s) => s.gate && s.gate.toLowerCase().includes(gateQuery));
      }

      if (filters?.status && filters.status !== 'ALL') {
        list = list.filter((s) => s.status === filters.status);
      }

      if (filters?.memberId && filters.memberId !== 'ALL') {
        list = list.filter((s) => s.memberId === filters.memberId);
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (s) =>
            s.memberName.toLowerCase().includes(q) ||
            s.shiftName.toLowerCase().includes(q) ||
            (s.gate && s.gate.toLowerCase().includes(q))
        );
      }

      return list;
    } catch (err) {
      console.error('Error fetching shifts from backend:', err);
      return [];
    }
  }

  async getTodayShifts(): Promise<Shift[]> {
    return this.getAllShifts({ date: getTodayDateStr() });
  }

  async getShiftById(id: string): Promise<Shift | undefined> {
    const all = await this.getAllShifts();
    return all.find((s) => s.id === id);
  }

  /**
   * Obtiene el turno asignado al guarda actual (para la vista de Portería)
   */
  async getMyCurrentShift(memberId: string): Promise<Shift | null> {
    try {
      let shifts: any[] = [];
      // 1. Intentar endpoint de sesión directa (/staff/shifts/my-shifts)
      try {
        const myRes = await apiClient.get<any[]>('/staff/shifts/my-shifts');
        if (Array.isArray(myRes) && myRes.length > 0) {
          shifts = myRes;
        }
      } catch {
        // fallback
      }

      // 2. Si no encontró por sesión, buscar por memberId
      if (shifts.length === 0 && memberId) {
        const res = await apiClient.get<any[]>(`/staff/shifts/by-staff/${memberId}`);
        if (Array.isArray(res) && res.length > 0) {
          shifts = res;
        }
      }

      // 3. Si aún está vacío, buscar en los turnos de hoy de la copropiedad
      const today = getTodayDateStr();
      if (shifts.length === 0) {
        try {
          const todayRes = await apiClient.get<any[]>(`/staff/shifts/by-date?date=${today}`);
          if (Array.isArray(todayRes)) {
            const match = todayRes.find(
              (s) => memberId && s.staffMemberId === memberId && s.status !== 'CANCELLED'
            );
            if (match) shifts = [match];
          }
        } catch {
          // ignore
        }
      }

      const todayShift = shifts.find(
        (s) => s.shiftDate === today && s.status !== 'CANCELLED'
      );
      if (todayShift) {
        return {
          id: todayShift.id,
          tenantId: todayShift.tenantId,
          date: todayShift.shiftDate,
          memberId: todayShift.staffMemberId,
          memberName: todayShift.staffMemberName,
          memberPosition: todayShift.staffMemberPosition,
          area: todayShift.area || 'Seguridad',
          shiftName: todayShift.shiftName,
          startTime: formatTime(todayShift.startTime),
          endTime: formatTime(todayShift.endTime),
          gate: todayShift.gate || 'Portería Principal',
          shiftType: todayShift.shiftType || 'Normal',
          status: backendStatusToFrontend(todayShift.status),
          notes: todayShift.notes,
        };
      }

      const activeShift = shifts.find(
        (s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED'
      );
      if (activeShift) {
        return {
          id: activeShift.id,
          tenantId: activeShift.tenantId,
          date: activeShift.shiftDate,
          memberId: activeShift.staffMemberId,
          memberName: activeShift.staffMemberName,
          memberPosition: activeShift.staffMemberPosition,
          area: activeShift.area || 'Seguridad',
          shiftName: activeShift.shiftName,
          startTime: formatTime(activeShift.startTime),
          endTime: formatTime(activeShift.endTime),
          gate: activeShift.gate || 'Portería Principal',
          shiftType: activeShift.shiftType || 'Normal',
          status: backendStatusToFrontend(activeShift.status),
          notes: activeShift.notes,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Próximos turnos del guarda (Hoy, Mañana, Esta semana)
   */
  async getMyUpcomingShifts(memberId: string): Promise<{
    today: Shift[];
    tomorrow: Shift[];
    thisWeek: Shift[];
    allShifts?: Shift[];
  }> {
    try {
      let raw: any[] = [];
      try {
        const myRes = await apiClient.get<any[]>('/staff/shifts/my-shifts');
        if (Array.isArray(myRes) && myRes.length > 0) raw = myRes;
      } catch {
        // fallback
      }

      if (raw.length === 0 && memberId) {
        const res = await apiClient.get<any[]>(`/staff/shifts/by-staff/${memberId}`);
        if (Array.isArray(res)) raw = res;
      }
      const todayStr = getTodayDateStr();

      const d = new Date();
      d.setDate(d.getDate() + 1);
      const tomorrowStr = d.toISOString().split('T')[0];

      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const mapped: Shift[] = raw
        .filter((s) => s.status !== 'CANCELLED')
        .map((s) => ({
          id: s.id,
          tenantId: s.tenantId,
          date: s.shiftDate,
          memberId: s.staffMemberId,
          memberName: s.staffMemberName,
          memberPosition: s.staffMemberPosition,
          area: s.area || 'Seguridad',
          shiftName: s.shiftName,
          startTime: formatTime(s.startTime),
          endTime: formatTime(s.endTime),
          gate: s.gate || 'Portería Principal',
          shiftType: s.shiftType || 'Normal',
          status: backendStatusToFrontend(s.status),
          notes: s.notes,
        }));

      const today = mapped.filter((s) => s.date === todayStr);
      const tomorrow = mapped.filter((s) => s.date === tomorrowStr);
      const thisWeek = mapped.filter((s) => s.date && s.date > tomorrowStr && s.date <= weekEndStr);

      return { today, tomorrow, thisWeek, allShifts: mapped };
    } catch {
      return { today: [], tomorrow: [], thisWeek: [], allShifts: [] };
    }
  }

  /**
   * Crear un nuevo turno conectando al backend POST /api/v1/staff/shifts
   */
  async createShift(data: Omit<Shift, 'id'>): Promise<Shift> {
    const startTimeFormatted = data.startTime.length === 5 ? `${data.startTime}:00` : data.startTime;
    const endTimeFormatted = data.endTime.length === 5 ? `${data.endTime}:00` : data.endTime;

    const payload = {
      staffMemberId: data.memberId,
      shiftDate: data.date || getTodayDateStr(),
      shiftName: data.shiftName || `Turno ${data.startTime} — ${data.gate || 'Portería'}`,
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      gate: data.gate || 'Portería Principal',
      shiftType: data.shiftType || 'Normal',
      notes: data.notes || '',
    };

    const res = await apiClient.post<any>('/staff/shifts', payload);

    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));

    return {
      id: res.id,
      tenantId: res.tenantId,
      date: res.shiftDate,
      memberId: res.staffMemberId,
      memberName: res.staffMemberName,
      memberPosition: res.staffMemberPosition,
      area: res.area || 'Seguridad',
      shiftName: res.shiftName,
      startTime: formatTime(res.startTime),
      endTime: formatTime(res.endTime),
      gate: res.gate,
      shiftType: res.shiftType,
      status: backendStatusToFrontend(res.status),
      notes: res.notes,
    };
  }

  /**
   * Crear turnos recurrentes para N semanas en el backend
   */
  async createRecurrentShifts(
    base: Omit<Shift, 'id' | 'date'>,
    selectedDays: string[],
    durationWeeks: number,
    startDateStr?: string
  ): Promise<Shift[]> {
    const dayMap: Record<string, number> = {
      Domingo: 0,
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
    };

    const created: Shift[] = [];
    const baseDate = startDateStr ? new Date(`${startDateStr}T12:00:00`) : new Date();

    for (let week = 0; week < durationWeeks; week++) {
      for (const day of selectedDays) {
        const targetDayNum = dayMap[day];
        if (targetDayNum === undefined) continue;

        const currentDayNum = baseDate.getDay();
        const diff = targetDayNum - currentDayNum;
        const shiftDate = new Date(baseDate);
        shiftDate.setDate(baseDate.getDate() + diff + week * 7);

        const yyyy = shiftDate.getFullYear();
        const mm = String(shiftDate.getMonth() + 1).padStart(2, '0');
        const dd = String(shiftDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const createdShift = await this.createShift({
          ...base,
          date: dateStr,
          status: 'PROGRAMADO',
          isRecurrent: true,
        });
        created.push(createdShift);
      }
    }

    return created;
  }

  /**
   * Cambiar el guarda asignado a un turno en el backend
   */
  async changeShiftGuard(
    shiftId: string,
    newMemberId: string,
    newMemberName?: string,
    newMemberPosition?: string
  ): Promise<Shift | null> {
    const res = await apiClient.patch<any>(`/staff/shifts/${shiftId}/reassign?newStaffMemberId=${newMemberId}`);

    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));

    return {
      id: res.id,
      tenantId: res.tenantId,
      date: res.shiftDate,
      memberId: res.staffMemberId,
      memberName: res.staffMemberName || newMemberName || 'Guarda',
      memberPosition: res.staffMemberPosition || newMemberPosition || 'Guarda de seguridad',
      area: res.area || 'Seguridad',
      shiftName: res.shiftName,
      startTime: formatTime(res.startTime),
      endTime: formatTime(res.endTime),
      gate: res.gate,
      shiftType: res.shiftType,
      status: backendStatusToFrontend(res.status),
      notes: res.notes,
    };
  }

  /**
   * Cancelar un turno en el backend
   */
  async cancelShift(shiftId: string): Promise<boolean> {
    await apiClient.patch<any>(`/staff/shifts/${shiftId}/cancel`);
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));
    return true;
  }

  /**
   * Eliminar un turno del backend
   */
  async deleteShift(shiftId: string): Promise<boolean> {
    await apiClient.delete<any>(`/staff/shifts/${shiftId}`);
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));
    return true;
  }

  /**
   * Duplicar un turno para otra fecha en el backend
   */
  async duplicateShift(shiftId: string, newDate: string): Promise<Shift | null> {
    const original = await this.getShiftById(shiftId);
    if (!original) return null;

    return this.createShift({
      tenantId: original.tenantId,
      memberId: original.memberId,
      memberName: original.memberName,
      memberPosition: original.memberPosition,
      area: original.area,
      shiftName: original.shiftName,
      startTime: original.startTime,
      endTime: original.endTime,
      gate: original.gate,
      shiftType: original.shiftType,
      date: newDate,
      status: 'PROGRAMADO',
      notes: original.notes,
    });
  }

  /**
   * Obtiene la matriz de cobertura de porterías para una fecha específica desde el backend
   */
  async getCoverageSlots(date: string = getTodayDateStr()): Promise<GateCoverageSlot[]> {
    const dayShifts = await this.getAllShifts({ date });

    const isMatch = (shift: Shift, gateName: string, startHour: string) => {
      const g = (shift.gate || '').toLowerCase();
      const target = gateName.toLowerCase();
      const matchesGate = g.includes(target) || (target.includes('principal') && g.includes('principal')) || (target.includes('secundaria') && g.includes('secundaria'));
      const matchesStart = shift.startTime.startsWith(startHour);
      return matchesGate && matchesStart && shift.status !== 'CANCELADO';
    };

    const mainDayShift = dayShifts.find((s) => isMatch(s, 'principal', '06'));
    const mainNightShift = dayShifts.find((s) => isMatch(s, 'principal', '18'));
    const secDayShift = dayShifts.find((s) => isMatch(s, 'secundaria', '06'));
    const secNightShift = dayShifts.find((s) => isMatch(s, 'secundaria', '18'));

    const buildSlot = (
      gateLabel: string,
      timeRange: string,
      rawStartTime: string,
      rawEndTime: string,
      shift?: Shift
    ): GateCoverageSlot => {
      const hasGuard = Boolean(shift && shift.memberId && shift.memberName !== 'Sin asignar');
      const isCheckedIn = Boolean(shift?.actualCheckIn);

      let status: 'CUBIERTO' | 'PENDIENTE' | 'SIN_COBERTURA' = 'SIN_COBERTURA';
      if (hasGuard) {
        status = isCheckedIn ? 'CUBIERTO' : 'PENDIENTE';
      }

      return {
        gate: gateLabel,
        timeRange,
        rawStartTime,
        rawEndTime,
        shiftId: shift?.id,
        guardId: shift?.memberId,
        guardName: hasGuard ? shift?.memberName : undefined,
        status,
        checkInStatus: isCheckedIn ? 'MARCADA' : 'PENDIENTE',
        actualCheckIn: shift?.actualCheckIn,
      };
    };

    return [
      buildSlot('Portería Principal', '06:00 AM — 06:00 PM', '06:00', '18:00', mainDayShift),
      buildSlot('Portería Principal', '06:00 PM — 06:00 AM', '18:00', '06:00', mainNightShift),
      buildSlot('Portería Secundaria', '06:00 AM — 06:00 PM', '06:00', '18:00', secDayShift),
      buildSlot('Portería Secundaria', '06:00 PM — 06:00 AM', '18:00', '06:00', secNightShift),
    ];
  }

  /**
   * Obtiene alertas operativas para el Administrador basadas en los turnos reales de hoy
   */
  async getShiftAlerts(): Promise<ShiftAlert[]> {
    const today = getTodayDateStr();
    const shifts = await this.getAllShifts({ date: today });
    const alerts: ShiftAlert[] = [];

    const uncovered = shifts.find(
      (s) => (!s.memberId || s.memberName === 'Sin asignar') && s.status !== 'CANCELADO'
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

    const unmarked = shifts.find(
      (s) =>
        s.memberId &&
        s.memberName !== 'Sin asignar' &&
        !s.actualCheckIn &&
        s.status === 'PROGRAMADO'
    );
    if (unmarked) {
      alerts.push({
        id: `alert-unm-${unmarked.id}`,
        type: 'UNMARKED_SHIFT',
        severity: 'warning',
        title: 'Turno sin marcar',
        message: `El turno de ${unmarked.memberName} (${unmarked.startTime}) no registra entrada aún.`,
        shiftId: unmarked.id,
        guardName: unmarked.memberName,
        time: unmarked.startTime,
        actionText: 'Ver turno',
      });
    }

    return alerts;
  }

  /**
   * Obtiene el personal elegible real desde el backend (GET /api/v1/staff)
   */
  async getEligibleGuards(): Promise<PersonalMember[]> {
    try {
      const allStaff = await personalService.getPersonalList();
      if (!allStaff || allStaff.length === 0) return [];

      // Filter compatible guards (area 'Seguridad' or position Guarda/Vigilante/Portero)
      const compatible = allStaff.filter((m) => {
        const area = (m.area || '').toLowerCase();
        const pos = (m.position || '').toLowerCase();
        return (
          area.includes('seguridad') ||
          area.includes('portería') ||
          pos.includes('guarda') ||
          pos.includes('vigilante') ||
          pos.includes('seguridad') ||
          pos.includes('portero')
        );
      });

      // If no specialized guards found, return all active staff so scheduling is never blocked
      return compatible.length > 0 ? compatible : allStaff;
    } catch (err) {
      console.error('Error fetching eligible guards:', err);
      return [];
    }
  }

  /**
   * Actualiza el estado de marcación de un turno (cuando el guarda marca entrada o salida)
   */
  async updateShiftCheckTimes(
    shiftId: string,
    actualCheckIn?: string,
    actualCheckOut?: string
  ): Promise<Shift | null> {
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));
    return null;
  }

  /**
   * Restablecer datos iniciales para demostración
   */
  resetDemoData(): void {
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));
  }
}

export const shiftService = new ShiftService();
