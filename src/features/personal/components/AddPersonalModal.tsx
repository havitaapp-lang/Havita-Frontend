import { useState, useEffect } from 'react';
import { X, User, ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, KeyRound, Eye, EyeOff, RefreshCw, Sparkles, Mail, Lock } from 'lucide-react';
import type { PersonalArea, ContractType, SystemRole, GateAssignment } from '../types/personal.types';
import { personalService } from '../services/personalService';
import { notificationService } from '../../../services/notificationService';
import { getAssignableRoles } from '../../../services/roleService';
import type { RoleDto } from '../../../services/roleService';
import { CharacterCounter } from '../../../components/ui/CharacterCounter';
import { FIELD_LIMITS } from '../../../validation/rules/limits';
import { formatPhoneInput, formatDocumentInput } from '../../../utils/formatters';
import { sanitizeEmailInput } from '../../../utils/sanitizers';

interface AddPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPersonalModal: React.FC<AddPersonalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleDto[]>([]);

  useEffect(() => {
    if (isOpen) {
      getAssignableRoles().then(roles => {
        // Solo mostrar roles pertinentes para personal (filtrar SUPER_ADMIN, PLATFORM_ADMIN)
        const staffRoles = roles.filter(r => r.code !== 'SUPER_ADMIN' && r.code !== 'PLATFORM_ADMIN');
        setAvailableRoles(staffRoles);
      }).catch(console.error);
    }
  }, [isOpen]);

  // Paso 1: Datos Personales y Laborales
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState<'CC' | 'CE' | 'PASAPORTE' | 'PEP'>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [position, setPosition] = useState('');
  const [area, setArea] = useState<PersonalArea>('Seguridad');
  const [contractType, setContractType] = useState<ContractType>('Empleado');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Paso 2: Acceso y Seguridad (Login con Email)
  const [enableAccess, setEnableAccess] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [systemRole, setSystemRole] = useState<SystemRole>('SECURITY');
  const [assignedGate, setAssignedGate] = useState<GateAssignment>('Portería principal');

  if (!isOpen) return null;

  // Generador de contraseña segura automática
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
    notificationService.showToast('Contraseña temporal generada', 'info');
  };

  const handleNext = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !documentNumber.trim()) {
        notificationService.showToast('Por favor completa nombre, apellido y documento', 'warning');
        return;
      }
      if (!position.trim()) {
        notificationService.showToast('Por favor ingresa el cargo del colaborador', 'warning');
        return;
      }

      // Sincronizar email ingresado para el acceso de login
      const cleanEmail = email.trim().toLowerCase();
      if (!loginEmail) {
        setLoginEmail(cleanEmail);
      }

      // Ajustar rol por defecto inteligente según área
      if (area === 'Seguridad' || area === 'Portería') {
        setSystemRole('SECURITY');
        setAssignedGate('Portería principal');
      } else if (area === 'Administración') {
        setSystemRole('COMMUNITY_ADMIN');
      } else if (area === 'MAINTENANCE' || area === 'Aseo') {
        setSystemRole('STAFF');
      } else {
        setSystemRole('READ_ONLY');
      }

      // Si no tiene contraseña aún y está habilitado el acceso, autogenerar una inicial
      if (!password) {
        generateSecurePassword();
      }

      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (enableAccess) {
      const activeLoginEmail = (loginEmail || email).trim().toLowerCase();
      if (!activeLoginEmail) {
        notificationService.showToast('El correo de acceso es obligatorio para habilitar el usuario', 'warning');
        return;
      }
      if (!password.trim() || password.length < 6) {
        notificationService.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
      }
    }

    try {
      setLoading(true);

      const activeLoginEmail = (loginEmail || email).trim().toLowerCase();

      await personalService.createPersonal({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentType,
        documentNumber: documentNumber.trim(),
        phone: phone.trim(),
        email: email.trim() || activeLoginEmail,
        position: position.trim(),
        area,
        contractType,
        company: contractType !== 'Empleado' ? company.trim() : undefined,
        startDate,
        status: 'ACTIVO',
        currentShift: {
          name: area === 'Seguridad' ? 'Turno Rotativo Operativo' : 'Horario Diurno Convencional',
          schedule: area === 'Seguridad' ? '06:00 - 14:00' : '08:00 - 17:00',
          days: 'Lun - Sáb',
          gate: assignedGate,
        },
        systemAccess: enableAccess
          ? {
              enabled: true,
              username: activeLoginEmail, // En Havita el username es el correo de acceso
              loginEmail: activeLoginEmail,
              password: password.trim(),
              role: systemRole,
              status: 'ACTIVO',
              assignedGate: (systemRole === 'SECURITY') ? assignedGate : undefined,
              createdAt: new Date().toISOString().split('T')[0],
            }
          : {
              enabled: false,
              username: '',
              loginEmail: '',
              role: 'SOLO_LECTURA',
              status: 'INACTIVO',
            },
      });

      notificationService.showToast(`Personal "${firstName} ${lastName}" registrado con éxito`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      notificationService.showToast(err?.message || 'Error al registrar personal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--tenant-primary)]" />
              Alta Rápida de Empleado / Personal
            </h2>
            <p className="text-xs text-slate-500">
              Registra la información del colaborador y configura su acceso con correo y contraseña.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper simplificado en 2 fases */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                step === 1
                  ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  step === 1 ? 'bg-[var(--tenant-primary)] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                1
              </div>
              <div className="truncate">
                <p className="text-xs leading-none font-bold">Datos & Cargo</p>
                <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">Identidad y puesto laboral</p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                step === 2
                  ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  step === 2 ? 'bg-[var(--tenant-primary)] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </div>
              <div className="truncate">
                <p className="text-xs leading-none font-bold">Acceso & Credenciales</p>
                <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">Correo, clave y permisos</p>
              </div>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* PASO 1: Datos Personales y Cargo */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Información Personal
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pers-fname" className="block font-bold text-slate-700">Nombre(s) <span className="text-rose-500">*</span></label>
                      <CharacterCounter current={firstName.length} max={FIELD_LIMITS.NAME_MAX_LENGTH} />
                    </div>
                    <input
                      id="pers-fname"
                      type="text"
                      maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ej. Carlos"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pers-lname" className="block font-bold text-slate-700">Apellidos <span className="text-rose-500">*</span></label>
                      <CharacterCounter current={lastName.length} max={FIELD_LIMITS.NAME_MAX_LENGTH} />
                    </div>
                    <input
                      id="pers-lname"
                      type="text"
                      maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej. Rodríguez Salazar"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="pers-doctype" className="block font-bold text-slate-700 mb-1">Tipo Doc.</label>
                    <select
                      id="pers-doctype"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    >
                      <option value="CC">Cédula (CC)</option>
                      <option value="CE">Cédula Ext. (CE)</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="PEP">PEP</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="pers-docnum" className="block font-bold text-slate-700 mb-1">Número de Documento <span className="text-rose-500">*</span></label>
                    <input
                      id="pers-docnum"
                      type="text"
                      maxLength={FIELD_LIMITS.DOCUMENT_MAX_LENGTH}
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(formatDocumentInput(e.target.value))}
                      placeholder="Ej. 1020304050"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pers-phone" className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                    <input
                      id="pers-phone"
                      type="tel"
                      maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="300 123 4567"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pers-email" className="block font-bold text-slate-700 mb-1">Correo Electrónico <span className="text-rose-500">*</span></label>
                    <input
                      id="pers-email"
                      type="email"
                      maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        const sanitized = sanitizeEmailInput(e.target.value);
                        setEmail(sanitized);
                        if (!loginEmail || loginEmail === email) {
                          setLoginEmail(sanitized);
                        }
                      }}
                      placeholder="empleado@empresa.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Información de Puesto */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Ficha Laboral y Operativa
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pers-pos" className="block font-bold text-slate-700">Cargo / Puesto <span className="text-rose-500">*</span></label>
                      <CharacterCounter current={position.length} max={FIELD_LIMITS.NAME_MAX_LENGTH} />
                    </div>
                    <input
                      id="pers-pos"
                      type="text"
                      maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Ej. Guarda de Seguridad, Jardinero..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pers-area" className="block font-bold text-slate-700 mb-1">Área</label>
                    <select
                      id="pers-area"
                      value={area}
                      onChange={(e) => setArea(e.target.value as PersonalArea)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Seguridad">Seguridad</option>
                      <option value="Portería">Portería</option>
                      <option value="Administración">Administración</option>
                      <option value="Aseo">Aseo y Servicios</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Jardinería">Jardinería</option>
                      <option value="Servicios generales">Servicios generales</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pers-contract" className="block font-bold text-slate-700 mb-1">Tipo de Contratación</label>
                    <select
                      id="pers-contract"
                      value={contractType}
                      onChange={(e) => setContractType(e.target.value as ContractType)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Empleado">Empleado Directo</option>
                      <option value="Contratista">Contratista</option>
                      <option value="Proveedor">Proveedor Externo</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pers-startdate" className="block font-bold text-slate-700 mb-1">Fecha de Ingreso</label>
                    <input
                      id="pers-startdate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {contractType !== 'Empleado' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pers-company" className="block font-bold text-slate-700">Empresa Contratista / Proveedor</label>
                      <CharacterCounter current={company.length} max={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH} />
                    </div>
                    <input
                      id="pers-company"
                      type="text"
                      maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Ej. Seguridad Atlas Ltda, Limpiezas del Valle SAS..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: Acceso y Credenciales */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[var(--tenant-primary)]" />
                    ¿Habilitar acceso al sistema para este empleado?
                  </h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Podrá iniciar sesión con su correo electrónico y la contraseña asignada.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAccess}
                    onChange={(e) => setEnableAccess(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--tenant-primary)]" />
                </label>
              </div>

              {enableAccess ? (
                <div className="space-y-3.5 p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                  {/* Correo de acceso */}
                  <div>
                    <label htmlFor="pers-login-email" className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        Correo Electrónico de Inicio de Sesión <span className="text-rose-500">*</span>
                      </span>
                      {email && loginEmail !== email && (
                        <button
                          type="button"
                          onClick={() => setLoginEmail(email.toLowerCase())}
                          className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Usar correo del perfil
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="pers-login-email"
                        type="email"
                        maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(sanitizeEmailInput(e.target.value))}
                        placeholder="empleado@empresa.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      El empleado siempre iniciará sesión con esta dirección de correo.
                    </p>
                  </div>

                  {/* Contraseña */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pers-password" className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        Contraseña de Acceso <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateSecurePassword}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Generar segura
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="pers-password"
                        type={showPassword ? 'text' : 'password'}
                        maxLength={FIELD_LIMITS.PASSWORD_MAX_LENGTH}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña de mínimo 6 caracteres"
                        className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      Proporciónale esta contraseña al empleado para su primer acceso al sistema.
                    </p>
                  </div>

                  {/* Rol en plataforma */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <label className="block font-bold text-slate-700 mb-1">Rol de Autorización</label>
                    <select
                      value={systemRole}
                      onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:border-blue-500 focus:outline-none text-xs"
                    >
                      {availableRoles.map(r => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Asignación de portería si aplica */}
                  {(systemRole === 'SECURITY') && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl space-y-1.5 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Puesto / Portería Asignada
                      </div>
                      <select
                        value={assignedGate}
                        onChange={(e) => setAssignedGate(e.target.value as GateAssignment)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-emerald-950 font-semibold focus:outline-none text-xs"
                      >
                        <option value="Portería principal">Portería principal (Por defecto)</option>
                        <option value="Portería secundaria">Portería vehicular secundaria</option>
                        <option value="Todas las porterías">Todas las porterías (Rotativo)</option>
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                  <p className="font-bold text-xs text-slate-700">Sin acceso a la aplicación</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    El empleado solo quedará registrado para fines de nómina, fichas internas y asistencia.
                  </p>
                </div>
              )}

              {/* Resumen rápido de alta */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 space-y-1 text-[11px]">
                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Resumen: {firstName} {lastName}</span>
                  <span className="text-blue-600 font-semibold">{position} ({area})</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-slate-500">
                  <span>Doc: {documentType} {documentNumber}</span>
                  <span>•</span>
                  <span>Acceso: {enableAccess ? `${loginEmail || email || 'Email'} (${systemRole})` : 'Deshabilitado'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Volver a Datos
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-200/60 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              Continuar a Acceso y Clave
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Crear Empleado'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

