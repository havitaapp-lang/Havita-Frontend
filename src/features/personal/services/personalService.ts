import type { PersonalMember, Shift, AttendanceRecord, PersonalStatus, SystemAccess } from '../types/personal.types';
import { shiftService } from './shiftService';
import { attendanceService } from './attendanceService';
import { apiClient } from '../../../api/apiClient';

/**
 * El backend envía StaffMemberStatus (ACTIVE / INACTIVE) y el módulo trabaja con sus códigos (ACTIVO / INACTIVO), igual
 * que turnos y asistencia. Antes llegaba ACTIVE tal cual: el filtro «Activos» no coincidía y los colores fallaban. El
 * estado no se envía nunca al backend desde este servicio.
 */
export function staffStatusFromBackend(status?: string): PersonalStatus {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE': case 'ACTIVO': return 'ACTIVO';
    case 'INACTIVE': case 'INACTIVO': return 'INACTIVO';
    case 'SUSPENDIDO': return 'SUSPENDIDO';
    case 'FINALIZADO': return 'FINALIZADO';
    // Valor desconocido: se conserva (la etiqueta lo registra como «sin traducción» en vez de ocultarlo).
    default: return (status || 'INACTIVO') as PersonalStatus;
  }
}

/** Acceso al sistema que devuelve el API (nunca incluye la contraseña). */
function systemAccessFromBackend(a: any, gate?: string): SystemAccess | undefined {
  if (!a || !a.enabled) return undefined;
  return {
    enabled: true,
    username: a.loginEmail || '',
    loginEmail: a.loginEmail || undefined,
    role: (a.role === 'SECURITY' ? 'SECURITY' : 'STAFF') as SystemAccess['role'],
    status: a.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO',
    shared: Boolean(a.shared),
    assignedGate: (gate || undefined) as SystemAccess['assignedGate'],
  };
}

/** Colaborador del API → modelo del módulo. */
export function mapBackendStaff(s: any): PersonalMember {
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
    status: staffStatusFromBackend(s.status),
    systemAccess: systemAccessFromBackend(s.systemAccess, s.assignedGate),
    observations: s.observations || undefined,
    avatar: s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.firstName + ' ' + s.lastName)}&background=random`,
    lastAccessAt: 'Sin ingresos registrados',
  } as PersonalMember;
}

/** Nunca se guarda una contraseña en el navegador (antes se guardaba en texto plano). */
function withoutPassword(m: PersonalMember): PersonalMember {
  if (!m?.systemAccess || !('password' in m.systemAccess)) return m;
  const { password: _omit, ...access } = m.systemAccess;
  return { ...m, systemAccess: access as SystemAccess };
}

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
    const safe = key === STORAGE_KEY_PERSONAL ? (data as unknown as PersonalMember[]).map(withoutPassword) : data;
    localStorage.setItem(key, JSON.stringify(safe));
  } catch (err) {
    console.error('Error saving to storage:', err);
  }
}

class PersonalService {
  // Al cargar se eliminan las contraseñas que versiones anteriores guardaron en el navegador.
  private members: PersonalMember[] = (() => {
    const stored = loadStorage<PersonalMember>(STORAGE_KEY_PERSONAL, []);
    const clean = stored.map(withoutPassword);
    if (stored.some((m) => m?.systemAccess && 'password' in m.systemAccess)) saveStorage(STORAGE_KEY_PERSONAL, clean);
    return clean;
  })();
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
        let result = page.content.map((s: any) => mapBackendStaff(s));
        
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
        return mapBackendStaff(s);
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

  /**
   * Guarda los datos del colaborador en el SERVIDOR (PUT /staff/{id}); antes solo se guardaban en el navegador.
   * `current` son los datos actuales: el API recibe la ficha completa. Lanza el error si el servidor lo rechaza.
   */
  async updatePersonal(current: PersonalMember, updates: Partial<PersonalMember>): Promise<PersonalMember> {
    const m = { ...current, ...updates };
    const res = await apiClient.put<any>(`/staff/${current.id}`, {
      firstName: m.firstName,
      lastName: m.lastName,
      documentType: m.documentType,
      documentNumber: m.documentNumber,
      phone: m.phone,
      email: m.email,
      position: m.position,
      area: m.area,
      contractType: m.contractType,
      company: m.company,
      startDate: m.startDate,
      assignedGate: m.systemAccess?.assignedGate ?? current.systemAccess?.assignedGate,
      observations: m.observations,
    });
    return mapBackendStaff(res);
  }

  /**
   * Activa o desactiva en el SERVIDOR (POST /staff/{id}/status). Desactivar también quita el acceso al sistema en esta
   * comunidad. Antes solo se guardaba en el navegador: un portero «suspendido» seguía entrando. Lanza el error si el
   * servidor lo rechaza; devuelve el estado que confirma el servidor.
   */
  async updateStatus(id: string, status: PersonalStatus): Promise<PersonalStatus> {
    const res = await apiClient.post<any>(`/staff/${id}/status`, { status: status === 'ACTIVO' ? 'ACTIVE' : 'INACTIVE' });
    const confirmed = staffStatusFromBackend(res?.status);
    const member = this.members.find((m) => m.id === id);
    if (member) {
      member.status = confirmed;
      if (member.systemAccess) member.systemAccess.status = confirmed === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';
      saveStorage(STORAGE_KEY_PERSONAL, this.members);
    }
    return confirmed;
  }

  /**
   * Acceso al sistema en el SERVIDOR (PUT /staff/{id}/access). Antes solo se guardaba en el navegador, contraseña
   * incluida. La contraseña solo se envía si se escribe una nueva y nunca se guarda aquí. Lanza el error si el servidor
   * lo rechaza.
   */
  async updateSystemAccess(id: string, access: { enabled: boolean; loginEmail?: string; password?: string; role: 'SECURITY' | 'STAFF' }): Promise<PersonalMember> {
    const res = await apiClient.put<any>(`/staff/${id}/access`, {
      enabled: access.enabled,
      loginEmail: access.loginEmail || undefined,
      password: access.password || undefined,
      systemRole: access.role,
    });
    return mapBackendStaff(res);
  }

  async getShifts(): Promise<Shift[]> {
    return shiftService.getAllShifts();
  }

  async getAttendance(): Promise<AttendanceRecord[]> {
    return attendanceService.getAllRecords();
  }
}

export const personalService = new PersonalService();
