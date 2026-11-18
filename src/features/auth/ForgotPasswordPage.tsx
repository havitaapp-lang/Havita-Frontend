import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Mail, ArrowLeft, Building2 } from 'lucide-react';
import { FormField } from '../../components/ui/FormField';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { useTenant } from '../../contexts/TenantContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  const primaryColor = currentTenant?.primaryColor || '#6d28d9';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      notificationService.showError('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentTenant?.id) {
        headers['X-Tenant-ID'] = currentTenant.id;
      }

      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        throw new Error('Error al enviar la solicitud');
      }

      setIsSuccess(true);
      notificationService.showSuccess('Éxito', 'Si el correo está registrado, recibirás las instrucciones.');
    } catch (error) {
      notificationService.showError('Error', 'Ocurrió un problema de conexión. Inténtalo más tarde.');
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
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Revisa tu correo</h2>
              <p className="text-gray-600 mb-8">
                Si <strong>{email}</strong> está registrado en nuestro sistema, te hemos enviado un enlace para recuperar tu contraseña. 
                Recuerda revisar la carpeta de spam o correo no deseado.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al inicio de sesión
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            Recupera el acceso
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-md leading-relaxed">
            Ingresa el correo con el que estás registrado y te enviaremos instrucciones de forma inmediata.
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
              <CardTitle className="text-3xl font-bold text-gray-900 mb-3">¿Olvidaste tu contraseña?</CardTitle>
              <CardDescription className="text-gray-500 text-base">
                Te enviaremos un enlace seguro para que puedas crear una nueva contraseña.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <FormField
                  id="email"
                  label="Correo Electrónico"
                  required
                >
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </FormField>

                <SubmitButton
                  isSubmitting={isLoading}
                  loadingText="Enviando instrucciones..."
                  className="w-full py-3 rounded-xl text-white font-medium transition-all shadow-md mt-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  Enviar instrucciones
                </SubmitButton>
                
                <div className="text-center mt-6">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center text-sm font-medium hover:underline transition-all"
                    style={{ color: primaryColor }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Volver al inicio de sesión
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
