import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, Home, CheckCircle2, AlertCircle, RefreshCw, EyeOff, Eye, MapPin } from "lucide-react";
import { residentInvitationService } from "../../services/residentInvitationService";
import type { PublicInvitationResponse } from "../../services/residentInvitationService";
import { notificationService } from "../../services/notificationService";
import { CharacterCounter } from "../../components/ui/CharacterCounter";
import { FIELD_LIMITS } from "../../validation/rules/limits";
import { formatPhoneInput, formatDocumentInput } from "../../utils/formatters";
import { sanitizeEmailInput } from "../../utils/sanitizers";
import { FormErrorSummary } from "../../components/ui/FormErrorSummary";


export const ResidentRegistrationPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invInfo, setInvInfo] = useState<PublicInvitationResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);

  const [formData, setFormData] = useState({
    name: "",
    documentType: "CC",
    documentId: "",
    email: "",
    phone: "",
    password: "",
    acceptTerms: false,
    acceptPrivacy: false
  });

  useEffect(() => {
    if (!token) return;
    residentInvitationService.validatePublicToken(token)
      .then(data => {
        setInvInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || err.message || "Invitacion no valida");
        setLoading(false);
      });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    let val = e.target.value;
    if (name === "phone") val = formatPhoneInput(val);
    if (name === "documentId") val = formatDocumentInput(val);
    if (name === "email") val = sanitizeEmailInput(val);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorList([]);
    const newErrors: Record<string, string> = {};
    const newErrorList: Array<{field: string, message: string}> = [];

    const addError = (field: string, message: string) => {
      newErrors[field] = message;
      newErrorList.push({ field, message });
    };

    if (!formData.name.trim()) addError('name', 'El nombre completo es obligatorio.');
    if (!formData.documentId.trim()) addError('documentId', 'El número de documento es obligatorio.');
    if (!formData.email.trim()) addError('email', 'El correo electrónico es obligatorio.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) addError('email', 'El correo electrónico no es válido.');
    if (!formData.phone.trim()) addError('phone', 'El número de celular es obligatorio.');
    if (!formData.password || formData.password.length < 6) addError('password', 'La contraseña debe tener al menos 6 caracteres.');
    if (!formData.acceptTerms || !formData.acceptPrivacy) addError('terms', 'Debes aceptar los Términos y la Política de Privacidad.');

    if (newErrorList.length > 0) {
      setErrors(newErrors);
      setErrorList(newErrorList);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);
      await residentInvitationService.registerResident(token!, formData);
      setSuccess(true);
    } catch (err: any) {
      notificationService.showError("Error", err.response?.data?.message || err.message || "No se pudo completar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Validando invitacion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Invitacion Invalida</h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <button onClick={() => navigate("/login")} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-green-100">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Registro completado</h1>
          <p className="text-slate-600 mb-4">
            Bienvenido a <span className="font-bold text-slate-800">{invInfo?.tenantName}</span>.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-8 flex flex-col items-center gap-1">
            <Home className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-sm text-slate-500">{invInfo?.structureName}</span>
            <span className="font-bold text-slate-800">{invInfo?.propertyName}</span>
          </div>
          <button onClick={() => navigate("/login")} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm">
            Ingresar a Havita
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-black text-blue-600">Havita</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header Lock */}
            <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Building2 className="w-24 h-24" />
              </div>
              <h1 className="text-2xl font-bold mb-1 relative z-10">Crear tu cuenta</h1>
              <p className="text-blue-100 text-sm relative z-10">{invInfo?.tenantName}</p>
              
              <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 inline-flex flex-col items-center min-w-[200px] relative z-10">
                <MapPin className="w-5 h-5 text-blue-200 mb-1" />
                <span className="text-xs text-blue-200 font-medium uppercase tracking-wider">{invInfo?.structureName}</span>
                <span className="text-lg font-bold">{invInfo?.propertyName}</span>
              </div>
            </div>

            {/* Form */}
            <div className="p-6">
              <p className="text-sm text-slate-500 text-center mb-6">
                Completa tus datos para registrarte como <span className="font-bold text-slate-700">{invInfo?.invitationType === "OWNER" ? "propietario" : "residente"}</span> de esta vivienda.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {errorList.length > 0 && <FormErrorSummary errors={errorList} />}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700">Nombre Completo <span className="text-rose-500">*</span></label>
                    <CharacterCounter current={formData.name.length} max={FIELD_LIMITS.NAME_MAX_LENGTH} />
                  </div>
                  <input id="reg-name" required type="text" name="name" maxLength={FIELD_LIMITS.NAME_MAX_LENGTH} autoComplete="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="Ej. Juan Pérez" />
                    {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label htmlFor="reg-doctype" className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                    <select id="reg-doctype" name="documentType" value={formData.documentType} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="NIT">NIT</option>
                      <option value="PAS">PAS</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="reg-docid" className="block text-xs font-semibold text-slate-700 mb-1">Nº Documento <span className="text-rose-500">*</span></label>
                    <input id="reg-docid" required type="text" name="documentId" maxLength={FIELD_LIMITS.DOCUMENT_MAX_LENGTH} value={formData.documentId} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="123456789" />
                      {errors.documentId && <p className="text-xs text-rose-500 mt-1">{errors.documentId}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico <span className="text-rose-500">*</span></label>
                  <input id="reg-email" required type="email" name="email" maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH} autoComplete="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="juan@ejemplo.com" />
                    {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1">Celular</label>
                  <input id="reg-phone" type="tel" name="phone" maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH} autoComplete="tel" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="300 123 4567" />
                    {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1">Contraseña <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input id="reg-password" required type={showPassword ? "text" : "password"} name="password" maxLength={FIELD_LIMITS.PASSWORD_MAX_LENGTH} autoComplete="new-password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none pr-10" placeholder="Mínimo 6 caracteres" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                    {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">Si ya tienes una cuenta registrada en Havita, ingresa tu contraseña habitual para vincularte a esta unidad.</p>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative flex items-center mt-0.5">
                      <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} className="peer sr-only" />
                      <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded peer-checked:bg-[var(--tenant-primary)] peer-checked:border-[var(--tenant-primary)] transition-colors flex items-center justify-center">
                        <CheckCircle2 className={`w-3 h-3 text-white transition-opacity ${formData.acceptTerms ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-[12px] text-slate-600 leading-tight">
                      Acepto los <a href="/legal/terminos" target="_blank" className="text-blue-600 hover:underline">Términos de Servicio</a>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer group">
                    <div className="relative flex items-center mt-0.5">
                      <input type="checkbox" name="acceptPrivacy" checked={formData.acceptPrivacy} onChange={handleChange} className="peer sr-only" />
                      <div className="w-4 h-4 bg-slate-100 border border-slate-300 rounded peer-checked:bg-[var(--tenant-primary)] peer-checked:border-[var(--tenant-primary)] transition-colors flex items-center justify-center">
                        <CheckCircle2 className={`w-3 h-3 text-white transition-opacity ${formData.acceptPrivacy ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-[12px] text-slate-600 leading-tight">
                      He leído y acepto la <a href="/legal/privacidad" target="_blank" className="text-blue-600 hover:underline">Política de Privacidad</a>
                    </span>
                  </label>
                  {errors.terms && <p className="text-xs text-rose-500 mt-1">{errors.terms}</p>}
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2">
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Completar Registro
                  </button>
                </div>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

