import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Tenant } from '../types';
import { getSSOCookie } from '../utils/cookieUtils';

interface TenantContextProps {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant) => void;
  availableTenants: Tenant[];
  isResolving: boolean;
}

const TenantContext = createContext<TenantContextProps | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isResolving, setIsResolving] = useState(true);

  // Helper to extract subdomain from hostname
  const getSubdomainFromHost = (): string | null => {
    const host = window.location.hostname.toLowerCase();
    // Support formats: [subdomain].havita.localhost or [subdomain].localhost
    if (host.includes('.havita.localhost')) {
      const parts = host.split('.havita.localhost')[0];
      if (parts && parts !== 'www' && parts !== 'app') return parts;
    } else if (host.endsWith('.localhost')) {
      const parts = host.replace('.localhost', '');
      if (parts && parts !== 'www' && parts !== 'app') return parts;
    }
    return null;
  };

  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);

  // Sync with Backend Public Tenant API
  useEffect(() => {
    const syncTenantFromBackend = async () => {
      const sub = getSubdomainFromHost();
      try {
        setIsResolving(true);
        if (sub && sub !== 'admin' && sub !== 'super') {
          // The backend will now resolve the tenant via the Host header
          const res = await fetch(`/api/v1/public/tenant-config`);
          if (res.ok) {
            const data = await res.json();
            if (data?.data) {
              const backendTenant: Tenant = {
                id: data.data.id,
                name: data.data.name,
                slug: data.data.subdomain || sub, // Since slug might not be returned, use sub
                subdomain: data.data.subdomain || sub,
                logo: data.data.logoUrl || sub.substring(0, 3).toUpperCase(),
                primaryColor: data.data.primaryColor || '#1849A9',
                secondaryColor: data.data.secondaryColor || '#12B76A',
                address: data.data.address,
                city: data.data.city,
                // Dummy values for required Tenant fields not returned by public config
                phone: '',
                email: '',
                unitsCount: 150,
                structureType: 'Torres y Apartamentos',
                stratum: 5,
                status: 'ACTIVE',
              };
              setCurrentTenantState(backendTenant);
              localStorage.setItem('havita_tenant', JSON.stringify(backendTenant));
            }
          } else {
            // Tenant not found
            setCurrentTenantState(null);
            localStorage.removeItem('havita_tenant');
            window.dispatchEvent(new Event('havita_tenant_not_found'));
          }
        } else {
            // Global admin portal or no subdomain
            setCurrentTenantState(null);
            localStorage.removeItem('havita_tenant');
        }

        // We removed the public tenant list. The selector in the login page will be hidden.
        setAvailableTenants([]);
        
      } catch (err) {
        console.warn('Backend public tenants endpoint offline or in mock mode:', err);
      } finally {
        setIsResolving(false);
      }
    };

    syncTenantFromBackend();
  }, []);

    // No storage listeners. URL is the only source of truth.

  const setCurrentTenant = (tenant: Tenant) => {
    const currentHost = window.location.hostname;
    const currentSubdomain = getSubdomainFromHost();
    
    // If subdomain is the same, just update state and local storage
    if (currentSubdomain === tenant.subdomain) {
      setCurrentTenantState(tenant);
      localStorage.setItem('havita_tenant', JSON.stringify(tenant));
      return;
    }

    // If the subdomain is changing, do a hard redirect to the new URL
    const baseDomain = currentHost.includes('.localhost') 
      ? '.localhost' 
      : '.' + currentHost.split('.').slice(-2).join('.');
    
    // Determine target URL
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    let targetDomain = baseDomain;
    if (currentHost.endsWith('.localhost')) {
      targetDomain = '.localhost';
    }
    
    const newHost = `${tenant.subdomain}${targetDomain}`;
    
    // Preserve the current path and query string so they land on the same page
    const currentPath = window.location.pathname + window.location.search;
    
    let targetPath = currentPath;
    if (currentPath === '/' || currentPath === '/login') {
      targetPath = '/admin';
    }

    window.location.href = `${protocol}//${newHost}${port}${targetPath}`;
  };

  // Inject CSS variables for the current tenant theme
  useEffect(() => {
    if (currentTenant) {
      document.documentElement.style.setProperty('--tenant-primary', currentTenant.primaryColor);
      document.documentElement.style.setProperty('--tenant-secondary', currentTenant.secondaryColor);
    }
  }, [currentTenant]);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, availableTenants, isResolving }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
