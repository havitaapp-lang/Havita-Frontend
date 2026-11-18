import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Lock, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react';
import { FormField } from '../../components/ui/FormField';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { useTenant } from '../../contexts/TenantContext';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  const primaryColor = currentTenant?.primaryColor || '#6d28d9';

  useEffect(() => {
    if (!token) {
      notificationService.showError('Enlace inválido', 'El enlace de recuperación es inválido o ha expirado.');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      notificationService.showError('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      notificationService.showError('Error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      if (!res.ok) {
        throw new Error('El token ha expirado o es inválido');
      }

      setIsSuccess(true);
      notificationService.showSuccess('¡Contraseña actualizada!', 'Ya puedes iniciar sesión con tu nueva contraseña.');
    } catch (error: any) {
      notificationService.showError('Error', error.message || 'Ocurrió un problema al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-t-4 shadow-xl" style={{ borderTopColor: primaryColor }}>
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Contraseña Actualizada!</h2>
              <p className="text-gray-600 mb-8">
                Tu contraseña ha sido cambiada exitosamente. Ya puedes acceder a tu cuenta.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 text-white rounded-xl font-medium flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                Ir a iniciar sesión
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left Panel */}
      <div 
        className="w-full md:w-[45%] lg:w-[40%] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between hidden md:flex"
        style={{ backgroundColor: primaryColor }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            {currentTenant?.logo ? (
              <img src={currentTenant.logo} alt="Logo" className="h-10 object-contain" />
            ) : (
              <>
                <Building2 className="w-10 h-10" />
                <span className="text-3xl font-bold tracking-tight">
                  {currentTenant ? currentTenant.name : 'Havita'}
                </span>
              </>
            )}
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Crea tu nueva contraseña
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-md leading-relaxed">
            Ingresa una contraseña fuerte y segura para proteger el acceso a tu conjunto.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 lg:p-24 relative">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col items-center mb-8 text-center">
            {currentTenant?.logo ? (
              <img src={currentTenant.logo} alt="Logo" className="h-12 object-contain mb-4" />
            ) : (
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: primaryColor }}>
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {currentTenant?.name || 'Havita'}
            </h1>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-8 text-left md:text-center">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-3">Nueva Contraseña</CardTitle>
              <CardDescription className="text-gray-500 text-base">
                Asegúrate de que tenga al menos 8 caracteres.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <FormField
                  id="newPassword"
                  label="Nueva Contraseña"
                  required
                >
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormField>

                <FormField
                  id="confirmPassword"
                  label="Confirmar Contraseña"
                  required
                >
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </FormField>

                <SubmitButton
                  isSubmitting={isLoading}
                  loadingText="Actualizando..."
                  className="w-full py-3 rounded-xl text-white font-medium transition-all shadow-md mt-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  Restablecer Contraseña
                </SubmitButton>
                
                <div className="text-center mt-6">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center text-sm font-medium hover:underline transition-all"
                    style={{ color: primaryColor }}
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
