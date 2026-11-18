import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Tenant } from '../types';
import { getSubdomainFromHost, getBaseDomain, isIpAddress } from '../utils/domainUtils';
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

  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);

  // Sync with Backend Public Tenant API
  useEffect(() => {
    const syncTenantFromBackend = async () => {
      const sub = getSubdomainFromHost();
      try {
        setIsResolving(true);
        if (sub && sub !== 'admin' && sub !== 'super') {
          // If accessing via IP, pass ?subdomain= explicitly so backend can resolve it
          const fetchUrl = isIpAddress(window.location.hostname)
            ? `/api/v1/public/tenant-config?subdomain=${encodeURIComponent(sub)}`
            : `/api/v1/public/tenant-config`;

          const res = await fetch(fetchUrl);
          if (res.ok) {
            const data = await res.json();
            if (data?.data) {
              const backendTenant: Tenant = {
                id: data.data.id,
                name: data.data.name,
                slug: data.data.subdomain || sub,
                subdomain: data.data.subdomain || sub,
                logo: data.data.logoUrl || sub.substring(0, 3).toUpperCase(),
                primaryColor: data.data.primaryColor || '#1849A9',
                secondaryColor: data.data.secondaryColor || '#12B76A',
                address: data.data.address,
                city: data.data.city,
                phone: '',
                email: '',
                unitsCount: 150,
                structureType: 'Torres y Apartamentos',
                stratum: 5,
                status: 'ACTIVE',
              };
              setCurrentTenantState(backendTenant);
              localStorage.setItem('havita_tenant', JSON.stringify(backendTenant));            }
          } else {
            // Tenant not found
            setCurrentTenantState(null);
            localStorage.removeItem('havita_tenant');
            window.dispatchEvent(new Event('havita_tenant_not_found'));
          }
        } else {
          // Global admin portal or no subdomain
          // When on raw IP without subdomain, check if there's a stored tenant
          if (isIpAddress(window.location.hostname)) {
            const savedTenant = localStorage.getItem('havita_tenant');
            if (savedTenant) {
              try {
                const parsed = JSON.parse(savedTenant);
                setCurrentTenantState(parsed);              } catch {
                setCurrentTenantState(null);
                localStorage.removeItem('havita_tenant');
              }
            } else {
              setCurrentTenantState(null);
            }
          } else {
            setCurrentTenantState(null);
            localStorage.removeItem('havita_tenant');
          }
        }

        setAvailableTenants([]);
      } catch (err) {
        console.warn('Backend public tenants endpoint offline or in mock mode:', err);
      } finally {
        setIsResolving(false);
      }
    };

    syncTenantFromBackend();
  }, []);

  const setCurrentTenant = (tenant: Tenant) => {
    const currentHost = window.location.hostname;
    const currentSubdomain = getSubdomainFromHost();
    
    // If accessing via raw IP address or subdomain is the same, stay on current IP without breaking URL
    if (isIpAddress(currentHost) || currentSubdomain === tenant.subdomain) {
      setCurrentTenantState(tenant);
      localStorage.setItem('havita_tenant', JSON.stringify(tenant));
      return;
    }

    // If the subdomain is changing on standard domain, do a hard redirect to the new URL
    const baseDomain = getBaseDomain(currentHost);
    
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    const newHost = `${tenant.subdomain}.${baseDomain}`;
    
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
