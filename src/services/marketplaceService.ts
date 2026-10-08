import { apiClient } from '../api/apiClient';
import type { MarketplaceListing, MarketplaceConfig, MarketplaceReport, MarketplacePageResponse } from '../types';

// ─── Request types ──────────────────────────────────────────────────────────

export interface CreateListingDto {
  type: string;
  category: string;
  title: string;
  description: string;
  price?: number | null;
  priceType: string;
  imageKeys?: string[];
  contactPhone?: string;
  termsAccepted: boolean;
}

export interface UpdateListingDto {
  category?: string;
  title?: string;
  description?: string;
  price?: number | null;
  priceType?: string;
  imageKeys?: string[];
  contactPhone?: string;
}

export interface ReportListingDto {
  reason: string;
  description?: string;
}

export interface UpdateConfigDto {
  mode: string;
  listingDurationDays: number;
}

export interface UploadedFile {
  storageKey: string;
  url: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const marketplaceService = {
  // Resident: browse
  getListings: (params?: { type?: string; search?: string; page?: number; size?: number }): Promise<MarketplacePageResponse<MarketplaceListing>> => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);
    if (params?.page != null) query.append('page', String(params.page));
    if (params?.size != null) query.append('size', String(params.size));
    query.append('sort', 'publishedAt,desc');
    return apiClient.get<MarketplacePageResponse<MarketplaceListing>>(`/marketplace/listings?${query}`);
  },

  getListingById: (id: string): Promise<MarketplaceListing> =>
    apiClient.get<MarketplaceListing>(`/marketplace/listings/${id}`),

  getMyListings: (params?: { page?: number; size?: number }): Promise<MarketplacePageResponse<MarketplaceListing>> => {
    const query = new URLSearchParams();
    if (params?.page != null) query.append('page', String(params.page));
    if (params?.size != null) query.append('size', String(params.size));
    query.append('sort', 'createdAt,desc');
    return apiClient.get<MarketplacePageResponse<MarketplaceListing>>(`/marketplace/my-listings?${query}`);
  },

  createListing: (data: CreateListingDto): Promise<MarketplaceListing> =>
    apiClient.post<MarketplaceListing>('/marketplace/listings', data),

  updateListing: (id: string, data: UpdateListingDto): Promise<MarketplaceListing> =>
    apiClient.patch<MarketplaceListing>(`/marketplace/listings/${id}`, data),

  deleteListing: (id: string): Promise<void> =>
    apiClient.delete<void>(`/marketplace/listings/${id}`),

  reportListing: (id: string, data: ReportListingDto): Promise<void> =>
    apiClient.post<void>(`/marketplace/listings/${id}/report`, data),

  uploadImage: async (file: File, folder: string = 'marketplace'): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('isPublic', 'true');
    return apiClient.post<UploadedFile>('/files/upload', formData);
  },

  // Admin
  admin: {
    getListings: (params?: { status?: string; page?: number; size?: number }): Promise<MarketplacePageResponse<MarketplaceListing>> => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.page != null) query.append('page', String(params.page));
      if (params?.size != null) query.append('size', String(params.size));
      query.append('sort', 'createdAt,desc');
      return apiClient.get<MarketplacePageResponse<MarketplaceListing>>(`/admin/marketplace/listings?${query}`);
    },

    getPendingListings: (params?: { page?: number }): Promise<MarketplacePageResponse<MarketplaceListing>> => {
      const query = new URLSearchParams();
      if (params?.page != null) query.append('page', String(params.page));
      query.append('sort', 'createdAt,asc');
      return apiClient.get<MarketplacePageResponse<MarketplaceListing>>(`/admin/marketplace/listings/pending?${query}`);
    },

    approveListing: (id: string): Promise<MarketplaceListing> =>
      apiClient.post<MarketplaceListing>(`/admin/marketplace/listings/${id}/approve`, {}),

    rejectListing: (id: string, reason: string): Promise<MarketplaceListing> =>
      apiClient.post<MarketplaceListing>(`/admin/marketplace/listings/${id}/reject`, { reason }),

    hideListing: (id: string): Promise<MarketplaceListing> =>
      apiClient.post<MarketplaceListing>(`/admin/marketplace/listings/${id}/hide`, {}),

    getReports: (params?: { page?: number }): Promise<MarketplacePageResponse<MarketplaceReport>> => {
      const query = new URLSearchParams();
      if (params?.page != null) query.append('page', String(params.page));
      query.append('sort', 'createdAt,desc');
      return apiClient.get<MarketplacePageResponse<MarketplaceReport>>(`/admin/marketplace/reports?${query}`);
    },

    resolveReport: (id: string, action: 'RESOLVE' | 'DISMISS'): Promise<void> =>
      apiClient.post<void>(`/admin/marketplace/reports/${id}/resolve`, { action }),

    getConfig: (): Promise<MarketplaceConfig> =>
      apiClient.get<MarketplaceConfig>('/admin/marketplace/config'),

    updateConfig: (data: UpdateConfigDto): Promise<MarketplaceConfig> =>
      apiClient.put<MarketplaceConfig>('/admin/marketplace/config', data),

    toggleFeature: (enabled: boolean): Promise<void> =>
      apiClient.post<void>('/admin/marketplace/config/toggle', { enabled }),
  },
};
