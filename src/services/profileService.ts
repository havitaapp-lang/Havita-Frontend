import { apiClient } from '../api/apiClient';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface UserProfileDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  fullName: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const profileService = {
  /**
   * Obtiene el perfil del usuario autenticado.
   * GET /api/v1/users/me
   */
  getProfile: (): Promise<UserProfileDto> =>
    apiClient.get<UserProfileDto>('/users/me'),

  /**
   * Actualiza nombre completo y teléfono del usuario autenticado.
   * PATCH /api/v1/users/me
   */
  updateProfile: (data: UpdateProfileDto): Promise<UserProfileDto> =>
    apiClient.patch<UserProfileDto>('/users/me', data),

  /**
   * Cambia la contraseña del usuario autenticado.
   * Después de un cambio exitoso, el backend revoca todos los refresh tokens.
   * POST /api/v1/users/me/change-password
   */
  changePassword: (data: ChangePasswordDto): Promise<void> =>
    apiClient.post<void>('/users/me/change-password', data),
};
