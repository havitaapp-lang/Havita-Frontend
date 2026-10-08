import { apiClient } from '../api/apiClient';

export interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  planTier: string;
  grossPricePerProperty: number;
  billingCycle: string;
  status: string;
  startDate: string;
  expiresAt: string;
  paymentMethod: string;
  autoRenew: boolean;
}

class SubscriptionService {
  async getCurrentSubscription(): Promise<Subscription> {
    return apiClient.get<Subscription>('/saas/subscription/current');
  }

  async changePlan(planCode: string): Promise<Subscription> {
    return apiClient.post<Subscription>('/saas/subscription/change-plan', { planCode });
  }
}

export const subscriptionService = new SubscriptionService();
