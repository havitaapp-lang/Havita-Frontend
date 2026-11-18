import ResidentEmergency from '../features/resident/ResidentEmergency';
import SecurityAlerts from '../features/security/SecurityAlerts';
import { useEffect } from 'react';
import { ResidentRegistrationPage } from '../features/auth/ResidentRegistrationPage';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Building2, Home } from 'lucide-react';
import { TenantProvider, useTenant } from '../contexts/TenantContext';
import { getSubdomainFromHost, getBaseDomain } from '../utils/domainUtils';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';

import { PublicLayout } from '../layouts/PublicLayout';
import { LandingPage } from '../features/public/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { AppLaunch } from './AppLaunch';
import { APP_LAUNCH_PATH } from './appLaunchPaths';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { VisitorPassView } from '../features/public/VisitorPassView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';

// Legal Pages
import { LegalLayout } from '../features/legal/LegalLayout';
import { TermsPage, PrivacyPage, SecurityPage, PrivacyNoticePage } from '../features/legal/LegalPages';

// Layouts
import { AdminLayout } from '../layouts/AdminLayout';
import { ResidentLayout } from '../layouts/ResidentLayout';
import { SecurityLayout } from '../layouts/SecurityLayout';

// Admin Views
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { ResidentsPage } from '../features/admin/ResidentsPage';
import { PropertiesPage } from '../features/admin/PropertiesPage';
import { CommunicationsPage } from '../features/admin/CommunicationsPage';
import { AdminPackages } from '../features/admin/AdminPackages';
import { AdminVisitors } from '../features/admin/AdminVisitors';
import { AdminRequests } from '../features/admin/AdminRequests';
import { AdminReservations } from '../features/admin/AdminReservations';
import { AdminDocuments } from '../features/admin/AdminDocuments';
import { AdminSettings } from '../features/admin/AdminSettings';
import { PersonalPage } from '../features/personal/pages/PersonalPage';
import { PersonalDetailPage } from '../features/personal/pages/PersonalDetailPage';
import { AdminShiftsPage } from '../features/personal/pages/AdminShiftsPage';
import { AdminAttendancePage } from '../features/personal/pages/AdminAttendancePage';
import { AssembliesPage } from '../features/assemblies/pages/AssembliesPage';
import { AssemblyDetailPage } from '../features/assemblies/pages/AssemblyDetailPage';
import { ResidentProxiesPage } from '../features/assemblies/proxies/pages/ResidentProxiesPage';
import { isAssemblyProxiesEnabled } from '../features/assemblies/proxies/featureFlags';

// Security Views
import { SecurityDashboard } from '../features/security/SecurityDashboard';
import { SecurityVisitors } from '../features/security/SecurityVisitors';
import { ResidentChatPage } from '../features/chat/ResidentChatPage';
import { SecurityChatPage } from '../features/chat/SecurityChatPage';
import { SecurityPackages } from '../features/security/SecurityPackages';
import { SecurityIntercom } from '../features/security/SecurityIntercom';
import { SecurityProfilePage } from '../features/security/SecurityProfilePage';

// Resident Views
import { ResidentDashboard } from '../features/resident/ResidentDashboard';
import { ResidentVisitors } from '../features/resident/ResidentVisitors';
import { ResidentPackages } from '../features/resident/ResidentPackages';
import { ResidentRequests } from '../features/resident/ResidentRequests';
import { ResidentReservations } from '../features/resident/ResidentReservations';
import { ResidentCommunity } from '../features/resident/ResidentCommunity';
import { ResidentMyHome } from '../features/resident/ResidentMyHome';
import ResidentProfilePage from '../features/resident/ResidentProfilePage';
import { ResidentMarketplace } from '../features/resident/ResidentMarketplace';
import { ResidentMyListings } from '../features/resident/ResidentMyListings';
import { AdminMarketplacePage } from '../features/admin/AdminMarketplacePage';
import { AdminMarketplaceSettings } from '../features/admin/AdminMarketplaceSettings';
import { AdminIntercom } from '../features/admin/AdminIntercom';
import { AdminProfilePage } from '../features/admin/AdminProfilePage';

// Super Admin Layout & Views
import { SuperAdminLayout } from '../layouts/SuperAdminLayout';
import { SuperAdminDashboard } from '../features/superAdmin/SuperAdminDashboard';
import { TenantsPage } from '../features/superAdmin/TenantsPage';
import { TenantDetailPage } from '../features/superAdmin/TenantDetailPage';
import { OrganizationsPage } from '../features/superAdmin/OrganizationsPage';
import { GlobalUsersPage } from '../features/superAdmin/GlobalUsersPage';
import { TenantAdminsPage } from '../features/superAdmin/TenantAdminsPage';
import { PlansPage } from '../features/superAdmin/PlansPage';
import { SubscriptionsPage } from '../features/superAdmin/SubscriptionsPage';
import { FeatureFlagsPage } from '../features/superAdmin/FeatureFlagsPage';
import { AuditLogPage } from '../features/superAdmin/AuditLogPage';
import { GlobalSettingsPage } from '../features/superAdmin/GlobalSettingsPage';

const AuthRevocationListener = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleRevoked = () => {
      logout();
      navigate('/login', {
        replace: true,
        state: { reason: 'access_revoked' },
      });
    };

    const handleSessionExpired = () => {
      logout();
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:access_revoked', handleRevoked);
    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:access_revoked', handleRevoked);
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [navigate, logout]);

  return null;
};

const AppContent = () => {
  const { currentTenant, isResolving } = useTenant();
  
  const host = window.location.hostname;
  const isGlobalAdmin = host.startsWith('admin') || host.startsWith('super');
  const hasSubdomain = !!getSubdomainFromHost();
  
  if (!isResolving && hasSubdomain && !isGlobalAdmin && !currentTenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Building2 className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">
            Comunidad no encontrada
          </h1>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm md:text-base">
            El acceso a <strong className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">{host}</strong> no es válido, no tienes permisos o la comunidad se encuentra inactiva.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href={`${window.location.protocol}//${getBaseDomain(host)}${window.location.port ? ':' + window.location.port : ''}/`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Portal global
            </a>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Regresar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <BrowserRouter>
        <AuthRevocationListener />
        <Routes>
        {/* Public Marketing Landing */}
        <Route element={<PublicLayout />}>
           <Route path="/" element={isGlobalAdmin ? <Navigate to="/login" replace /> : <LandingPage />} />
        </Route>

        {/* Legal Pages (Public) */}
        <Route path="/legal" element={<LegalLayout />}>
          <Route index element={<Navigate to="/legal/terminos" replace />} />
          <Route path="terminos" element={<TermsPage />} />
          <Route path="privacidad" element={<PrivacyPage />} />
          <Route path="aviso-privacidad" element={<PrivacyNoticePage />} />
          <Route path="seguridad" element={<SecurityPage />} />
        </Route>
              
              {/* Auth & Public Passes */}
              <Route path="/login" element={<LoginPage />} />
              {/* P8-B: arranque de la PWA instalada (start_url): portal del rol o inicio de sesión */}
              <Route path={APP_LAUNCH_PATH} element={<AppLaunch />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/demo" element={<Navigate to="/login" replace />} />
              <Route path="/pass/:token" element={<VisitorPassView />} />
              <Route path="/register/invite/:token" element={<ResidentRegistrationPage />} />
              
              {/* Admin Portal (All Modules with Full CRUD) */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="residents" element={<ResidentsPage />} />
                <Route path="properties" element={<PropertiesPage />} />
                
                {/* Primary English routes */}
                <Route path="staff" element={<PersonalPage />} />
                <Route path="staff/:id" element={<PersonalDetailPage />} />
                <Route path="shifts" element={<AdminShiftsPage />} />
                <Route path="attendance" element={<AdminAttendancePage />} />
                <Route path="assemblies" element={<AssembliesPage />} />
                <Route path="assemblies/:id" element={<AssemblyDetailPage />} />

                {/* Backwards-compatibility aliases */}
                <Route path="personal" element={<Navigate to="/admin/staff" replace />} />
                <Route path="personal/:id" element={<PersonalDetailPage />} />
                <Route path="turnos" element={<Navigate to="/admin/shifts" replace />} />
                <Route path="asistencia" element={<Navigate to="/admin/attendance" replace />} />
                <Route path="asambleas" element={<Navigate to="/admin/assemblies" replace />} />
                <Route path="asambleas/:id" element={<AssemblyDetailPage />} />

                <Route path="communications" element={<CommunicationsPage />} />
                <Route path="intercom" element={<AdminIntercom />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="visitors" element={<AdminVisitors />} />
                {/* Fase 3: bandeja de chat de portería en solo lectura. */}
                <Route path="chat" element={<SecurityChatPage readOnly />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="reservations" element={<AdminReservations />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="marketplace" element={<AdminMarketplacePage />} />
                <Route path="marketplace/settings" element={<AdminMarketplaceSettings />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
              
              {/* Resident PWA (Full CRUD para el residente) */}
              <Route path="/resident" element={<ResidentLayout />}>
                <Route index element={<ResidentDashboard />} />
                <Route path="alerts" element={<ResidentEmergency />} />
              <Route path="visitors" element={<ResidentVisitors />} />
                <Route path="packages" element={<ResidentPackages />} />
                <Route path="requests" element={<ResidentRequests />} />
                <Route path="reservations" element={<ResidentReservations />} />
                <Route path="community" element={<ResidentCommunity />} />
                <Route path="marketplace" element={<ResidentMarketplace />} />
                <Route path="marketplace/my-listings" element={<ResidentMyListings />} />
                <Route path="my-home" element={<ResidentMyHome />} />
                {/* Fase 3: chat de texto con portería. */}
                <Route path="chat" element={<ResidentChatPage />} />
                {/* Fase 2 / P6: poderes (solo con VITE_FEATURE_ASSEMBLY_PROXIES=true; el backend decide los permisos). */}
                {isAssemblyProxiesEnabled() && <Route path="proxies" element={<ResidentProxiesPage />} />}
                <Route path="profile" element={<ResidentProfilePage />} />
                <Route path="*" element={<Navigate to="/resident" replace />} />
              </Route>
              
              {/* Portería / Security (Tablet-optimized Full CRUD) */}
              <Route path="/security" element={<SecurityLayout />}>
                <Route index element={<SecurityDashboard />} />
                <Route path="intercom" element={<SecurityIntercom />} />
                <Route path="alerts" element={<SecurityAlerts />} />
            <Route path="visitors" element={<SecurityVisitors />} />
                <Route path="packages" element={<SecurityPackages />} />
                {/* Fase 3: bandeja compartida del chat con residentes. */}
                <Route path="chat" element={<SecurityChatPage />} />
                <Route path="profile" element={<SecurityProfilePage />} />
                <Route path="*" element={<Navigate to="/security" replace />} />
              </Route>

              {/* Super Admin / Global SaaS Backoffice (Platform Command Center) */}
              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="tenants/:id" element={<TenantDetailPage />} />
                <Route path="organizations" element={<OrganizationsPage />} />
                <Route path="users" element={<GlobalUsersPage />} />
                <Route path="tenant-admins" element={<TenantAdminsPage />} />
                <Route path="features" element={<FeatureFlagsPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="settings" element={<GlobalSettingsPage />} />
                <Route path="*" element={<Navigate to="/super-admin" replace />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
};

export default App;

