import { apiClient } from '../api/apiClient';

export interface VotingDelegation {
    id: string;
    propertyId: string;
    ownerUserId: string;
    ownerUserName: string;
    delegateUserId: string;
    delegateUserName: string;
    status: 'ACTIVE' | 'REVOKED' | 'INVALIDATED';
    grantedAt: string;
    revokedAt?: string;
}

export const getActiveDelegation = async (propertyId: string): Promise<VotingDelegation | null> => {
    const res = await apiClient.get<VotingDelegation | null>(`/properties/${propertyId}/voting-delegation`);
    return res as any;
};

export const delegateVote = async (propertyId: string): Promise<VotingDelegation> => {
    const res = await apiClient.post<VotingDelegation>(`/properties/${propertyId}/voting-delegation`, {});
    return res as any;
};

export const revokeVote = async (propertyId: string): Promise<VotingDelegation> => {
    const res = await apiClient.delete<VotingDelegation>(`/properties/${propertyId}/voting-delegation`);
    return res as any;
};
