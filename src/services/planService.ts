import { apiClient } from '../api/apiClient';

export interface Plan {
  id: string;
  tier: string;
  name: string;
  tagline?: string;
  grossPricePerProperty: number;
  platformPricePerProperty: number;
  communitySharePerProperty: number;
  currency: string;
  billingPeriod: string;
  maxProperties: number | null;
  maxStorageBytes: number | null;
  maxAdminUsers: number | null;
  maxStaffUsers: number | null;
  maxPorters: number | null;
  maxDocuments: number | null;
  maxReservations: number | null;
  popular: boolean;
  features: string;
  status: string;
}

class PlanService {
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<Plan[]>('/saas/plans');
    return Array.isArray(response) ? response : (response as any).content || [];
  }
}

export const planService = new PlanService();
