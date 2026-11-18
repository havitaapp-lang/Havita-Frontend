import type { AttendanceRecord, AttendanceStatus, TodayAttendanceKpis } from '../types/personal.types';
import { shiftService, getTodayDateStr } from './shiftService';
import { apiClient } from '../../../api/apiClient';

function backendAttendanceToFrontend(b: any): AttendanceRecord {
  const formatTimeStr = (val?: string | null): string | undefined => {
    if (!val) return undefined;
    if (val.includes('T')) {
      const d = new Date(val);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return val.slice(0, 5);
  };

  const mapStatus = (st?: string): AttendanceStatus => {
    switch (st) {
      case 'PRESENT':
        return 'PRESENTE';
      case 'LATE':
        return 'TARDANZA';
      case 'ABSENT':
        return 'AUSENTE';
      default:
        return 'PRESENTE';
    }
  };

  return {
    id: b.id,
    tenantId: b.tenantId,
    shiftId: b.shiftId,
    memberId: b.staffMemberId,
    memberName: b.staffMemberName || 'Colaborador',
    position: b.staffMemberPosition || 'Personal operativo',
    area: 'Seguridad',
    date: b.recordDate,
    scheduledCheckIn: formatTimeStr(b.scheduledCheckIn),
    checkIn: formatTimeStr(b.checkIn),
    scheduledCheckOut: formatTimeStr(b.scheduledCheckOut),
    checkOut: formatTimeStr(b.checkOut),
    gate: b.gate || 'Portería Principal',
    status: mapStatus(b.status),
    observations: b.observations || '',
  };
}

class AttendanceService {
  /**
   * Obtiene todos los registros de asistencia desde el backend
   */
  async getAllRecords(filters?: {
    date?: string;
    memberId?: string;
    area?: string;
    status?: string;
    gate?: string;
    search?: string;
  }): Promise<AttendanceRecord[]> {
    try {
      let rawList: any[] = [];
      if (filters?.date) {
        const res = await apiClient.get<any[]>('/staff/attendance/by-date', { date: filters.date });
        rawList = Array.isArray(res) ? res : [];
      } else {
        const res = await apiClient.get<any>('/staff/attendance');
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.content)) {
          rawList = res.content;
        }
      }

      let list = rawList.map(backendAttendanceToFrontend);

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
    } catch (err) {
      console.error('Error fetching attendance records from backend:', err);
      return [];
    }
  }

  /**
   * Obtiene el historial de marcaciones del guarda actual ("Mis marcaciones")
   */
  async getMyAttendance(memberId?: string, params?: { page?: number; size?: number }): Promise<AttendanceRecord[]> {
    try {
      const queryParams: Record<string, any> = {
        size: params?.size ?? 100,
        sort: 'recordDate,desc',
      };
      if (params?.page !== undefined) {
        queryParams.page = params.page;
      }

      // 1. Intentar endpoint del colaborador autenticado
      try {
        const myRes = await apiClient.get<any>('/staff/attendance/my-attendance', queryParams);
        const items = Array.isArray(myRes)
          ? myRes
          : Array.isArray(myRes?.content)
          ? myRes.content
          : Array.isArray(myRes?.items)
          ? myRes.items
          : [];
        if (items.length > 0) {
          return items.map(backendAttendanceToFrontend);
        }
      } catch {
        // continuar a consulta por ID
      }

      if (memberId) {
        const res = await apiClient.get<any>(`/staff/attendance/by-staff/${memberId}`, queryParams);
        const items = Array.isArray(res)
          ? res
          : Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.items)
          ? res.items
          : [];
        if (items.length > 0) {
          return items.map(backendAttendanceToFrontend);
        }
      }

      return [];
    } catch (err) {
      console.error('Error fetching my attendance:', err);
      return [];
    }
  }

  /**
   * Obtiene la marcación activa o de hoy para un turno específico
   */
  async getRecordForShift(shiftId: string, memberId: string): Promise<AttendanceRecord | undefined> {
    try {
      const myRecords = await this.getMyAttendance(memberId);
      const match = myRecords.find((r) => r.shiftId === shiftId);
      if (match) return match;

      // Buscar en los registros de hoy de la copropiedad
      const todayRecords = await this.getAllRecords({ date: getTodayDateStr() });
      return todayRecords.find((r) => r.shiftId === shiftId || (memberId && r.memberId === memberId));
    } catch (err) {
      console.error('Error finding record for shift:', err);
      return undefined;
    }
  }

  /**
   * Marcar ENTRADA (desde Portería) directamente en el backend
   */
  async clockIn(params: {
    shiftId: string;
    memberId: string;
    gate?: string;
    actualTime?: string;
    isLate?: boolean;
    observations?: string;
  }): Promise<AttendanceRecord> {
    const res = await apiClient.post<any>('/staff/attendance/check-in', {
      staffMemberId: params.memberId,
      shiftId: params.shiftId,
      gate: params.gate,
      observations: params.observations,
    });

    window.dispatchEvent(new CustomEvent('havita_attendance_changed'));
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));

    return backendAttendanceToFrontend(res);
  }

  /**
   * Marcar SALIDA (desde Portería) directamente en el backend
   */
  async clockOut(params: {
    shiftId: string;
    memberId: string;
    actualTime?: string;
    observations?: string;
  }): Promise<AttendanceRecord | null> {
    const endpoint = `/staff/attendance/${params.memberId}/check-out${
      params.observations ? `?observations=${encodeURIComponent(params.observations)}` : ''
    }`;

    const res = await apiClient.post<any>(endpoint, {});

    window.dispatchEvent(new CustomEvent('havita_attendance_changed'));
    window.dispatchEvent(new CustomEvent('havita_shifts_changed'));

    return backendAttendanceToFrontend(res);
  }

  /**
   * Obtiene los KPIs de asistencia de hoy para el Dashboard y para la vista de Asistencia
   */
  async getTodayAttendanceKpis(): Promise<TodayAttendanceKpis> {
    try {
      const today = getTodayDateStr();
      const [records, shifts] = await Promise.all([
        this.getAllRecords({ date: today }),
        shiftService.getAllShifts({ date: today }),
      ]);

      const presentCount = records.filter((r) => r.status === 'PRESENTE' || r.status === 'TARDANZA').length;
      const absentCount = records.filter((r) => r.status === 'AUSENTE').length;
      const totalTodayShifts = Math.max(shifts.length, records.length);
      const pendingCount = Math.max(0, totalTodayShifts - presentCount - absentCount);

      return {
        totalTodayShifts,
        presentCount,
        pendingCount,
        absentCount,
      };
    } catch (err) {
      console.error('Error fetching today attendance KPIs:', err);
      return {
        totalTodayShifts: 0,
        presentCount: 0,
        pendingCount: 0,
        absentCount: 0,
      };
    }
  }

  /**
   * Limpiar datos para demostración
   */
  resetDemoData(): void {
    window.dispatchEvent(new CustomEvent('havita_attendance_changed'));
  }
}

export const attendanceService = new AttendanceService();
