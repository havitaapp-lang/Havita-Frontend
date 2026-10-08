export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  city?: string;
  unitsCount?: number;
}

export const defaultDemoTenant: TenantConfig = {
  id: 'tenant-limonar',
  name: 'Limonar Parque Residencial',
  slug: 'limonar',
  subdomain: 'limonar',
  logo: 'LPR',
  primaryColor: '#1769FF',
  secondaryColor: '#18B89A',
  city: 'Cali',
  unitsCount: 428
};

export const availableTenants: TenantConfig[] = [
  defaultDemoTenant,
  {
    id: 'tenant-altos-rio',
    name: 'Altos del Río',
    slug: 'altos-del-rio',
    subdomain: 'altosdelrio',
    logo: 'ADR',
    primaryColor: '#0369a1',
    secondaryColor: '#f59e0b',
    city: 'Medellín',
    unitsCount: 312
  },
  {
    id: 'tenant-torres-valle',
    name: 'Torres del Valle',
    slug: 'torres-del-valle',
    subdomain: 'torresdelvalle',
    logo: 'TDV',
    primaryColor: '#b91c1c',
    secondaryColor: '#475569',
    city: 'Bogotá',
    unitsCount: 520
  }
];
