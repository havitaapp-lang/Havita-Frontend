import { apiClient } from '../api/apiClient';
import type { Role } from '../types';

export interface RoleDto {
  code: Role;
  name: string;
  context: string;
  assignable: boolean;
}

export const getAssignableRoles = async (): Promise<RoleDto[]> => {
  const response = await apiClient.get<any>('/roles/assignable');
  return response || [];
};
