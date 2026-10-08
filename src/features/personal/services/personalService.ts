import type { PersonalMember, Shift, AttendanceRecord, PersonalStatus, SystemAccess } from '../types/personal.types';
import { shiftService } from './shiftService';
import { attendanceService } from './attendanceService';
import { apiClient } from '../../../api/apiClient';

const STORAGE_KEY_PERSONAL = 'havita_community_personal';
const STORAGE_KEY_SHIFTS = 'havita_community_shifts';

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
  } catch (err) {
    console.error('Error saving to storage:', err);
  }
}

class PersonalService {
  private members: PersonalMember[] = loadStorage(STORAGE_KEY_PERSONAL, []);
  private shifts: Shift[] = loadStorage(STORAGE_KEY_SHIFTS, []);

  async getPersonalList(filters?: {
    search?: string;
    area?: string;
    status?: string;
    contractType?: string;
  }): Promise<PersonalMember[]> {
    try {
      const page = await apiClient.get<any>('/staff', { search: filters?.search });
      if (page && page.content) {
        let result = page.content.map((s: any) => ({
          id: s.id,
          tenantId: s.tenantId,
          firstName: s.firstName,
          lastName: s.lastName,
          documentType: s.documentType,
          documentNumber: s.documentNumber,
          phone: s.phone,
          email: s.email,
          position: s.position,
          area: s.area,
          contractType: s.contractType,
          company: s.company,
          startDate: s.startDate,
          status: s.status,
          avatar: s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.firstName + ' ' + s.lastName)}&background=random`,
          lastAccessAt: 'Sin ingresos registrados'
        }));
        
        if (filters?.area && filters.area !== 'ALL') {
          result = result.filter((m: any) => m.area === filters.area);
        }
        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter((m: any) => m.status === filters.status);
        }
        if (filters?.contractType && filters.contractType !== 'ALL') {
          result = result.filter((m: any) => m.contractType === filters.contractType);
        }
        return result;
      }
    } catch (err) {
      console.warn('Failed to fetch from API, falling back to local storage', err);
    }

    let result = [...this.members];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          m.documentNumber.includes(q) ||
          m.position.toLowerCase().includes(q) ||
          (m.company && m.company.toLowerCase().includes(q))
      );
    }

    if (filters?.area && filters.area !== 'ALL') {
      result = result.filter((m) => m.area === filters.area);
    }

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((m) => m.status === filters.status);
    }

    if (filters?.contractType && filters.contractType !== 'ALL') {
      result = result.filter((m) => m.contractType === filters.contractType);
    }

    return result;
  }

  async getPersonalById(id: string): Promise<PersonalMember | undefined> {
    try {
      const s = await apiClient.get<any>(`/staff/${id}`);
      if (s) {
        return {
          id: s.id,
          tenantId: s.tenantId,
          firstName: s.firstName,
          lastName: s.lastName,
          documentType: s.documentType,
          documentNumber: s.documentNumber,
          phone: s.phone,
          email: s.email,
          position: s.position,
          area: s.area,
          contractType: s.contractType,
          company: s.company,
          startDate: s.startDate,
          status: s.status,
          avatar: s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.firstName + ' ' + s.lastName)}&background=random`,
          lastAccessAt: 'Sin ingresos registrados'
        } as PersonalMember;
      }
    } catch (err) {
      console.warn('Failed to fetch from API, falling back to local storage', err);
    }
    return this.members.find((m) => m.id === id);
  }

  async createPersonal(
    data: Omit<PersonalMember, 'id' | 'tenantId' | 'lastAccessAt'>
  ): Promise<PersonalMember> {
    let apiId = `pers-${Date.now()}`;
    let apiTenant = 'tenant-limonar';
    
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        phone: data.phone,
        email: data.email,
        position: data.position,
        area: data.area,
        contractType: data.contractType,
        company: data.company,
        startDate: data.startDate,
        assignedGate: data.currentShift?.gate,
        avatarUrl: data.avatar,
        observations: '',
        createSystemAccess: data.systemAccess?.enabled || false,
        loginEmail: data.systemAccess?.loginEmail,
        password: data.systemAccess?.password,
        systemRole: data.systemAccess?.role
      };

      const response = await apiClient.post<any>('/staff', payload);
      apiId = response.id;
      apiTenant = response.tenantId;
    } catch (err) {
      console.error('Error calling backend for createPersonal:', err);
      throw err; // Let the UI handle the error
    }

    const newMember: PersonalMember = {
      ...data,
      id: apiId,
      tenantId: apiTenant,
      lastAccessAt: 'Sin ingresos registrados',
      avatar:
        data.avatar ||
        `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?auto=format&fit=crop&w=150&q=80`,
    };

    this.members.unshift(newMember);
    saveStorage(STORAGE_KEY_PERSONAL, this.members);

    // If shift was defined, create a shift entry
    if (newMember.currentShift) {
      const newShift: Shift = {
        id: `sh-${Date.now()}`,
        tenantId: apiTenant,
        memberId: newMember.id,
        memberName: `${newMember.firstName} ${newMember.lastName}`,
        memberPosition: newMember.position,
        area: newMember.area,
        shiftName: newMember.currentShift.name,
        startTime: newMember.currentShift.schedule.split(' - ')[0] || '08:00',
        endTime: newMember.currentShift.schedule.split(' - ')[1] || '17:00',
        gate: newMember.systemAccess?.assignedGate,
        daysOfWeek: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        status: 'PROGRAMADO',
      };
      this.shifts.unshift(newShift);
      saveStorage(STORAGE_KEY_SHIFTS, this.shifts);
    }

    return newMember;
  }

  async updatePersonal(id: string, updates: Partial<PersonalMember>): Promise<PersonalMember | null> {
    const index = this.members.findIndex((m) => m.id === id);
    if (index === -1) return null;

    this.members[index] = {
      ...this.members[index],
      ...updates,
    };
    saveStorage(STORAGE_KEY_PERSONAL, this.members);
    return this.members[index];
  }

  async updateStatus(id: string, status: PersonalStatus): Promise<boolean> {
    const member = this.members.find((m) => m.id === id);
    if (!member) return false;
    member.status = status;
    if (status === 'INACTIVO' || status === 'FINALIZADO' || status === 'SUSPENDIDO') {
      if (member.systemAccess) {
        member.systemAccess.status = 'INACTIVO';
      }
    }
    saveStorage(STORAGE_KEY_PERSONAL, this.members);
    return true;
  }

  async updateSystemAccess(id: string, access: SystemAccess): Promise<boolean> {
    const member = this.members.find((m) => m.id === id);
    if (!member) return false;
    member.systemAccess = access;
    saveStorage(STORAGE_KEY_PERSONAL, this.members);
    return true;
  }

  async getShifts(): Promise<Shift[]> {
    return shiftService.getAllShifts();
  }

  async getAttendance(): Promise<AttendanceRecord[]> {
    return attendanceService.getAllRecords();
  }
}

export const personalService = new PersonalService();
