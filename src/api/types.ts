export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface QueryParams {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  [key: string]: string | number | boolean | null | undefined;
}

