import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Users,
  Vote,
  Clock,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { assemblyService } from '../services/assemblyService';
import type { Assembly } from '../types/assembly.types';
import { CreateAssemblyModal } from '../components/CreateAssemblyModal';

export const AssembliesPage = () => {
  const navigate = useNavigate();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadAssemblies = () => {
    assemblyService.getAssemblies().then(setAssemblies);
  };

  useEffect(() => {
    loadAssemblies();
  }, []);

  const activeAssembly = assemblies.find((a) => a.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Vote className="w-7 h-7 text-[var(--tenant-primary)]" />
            Asambleas y Votaciones de Copropietarios
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Conduce sesiones ordinarias y extraordinarias, calcula quórum y gestiona encuestas en tiempo real.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4" />
          Nueva Asamblea
        </button>
      </div>

      {/* Featured LIVE Assembly Banner */}
      {activeAssembly && (
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-lg border border-blue-800/60 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-red-500 text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  🔴 SESIÓN EN CURSO
                </span>
                <span className="text-xs text-blue-200 font-semibold">• Modalidad: {activeAssembly.modality}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeAssembly.title}
              </h2>

              <p className="text-xs text-blue-100/90 leading-relaxed">
                {activeAssembly.description || 'Sesión de copropietarios en desarrollo. Conduce preguntas, abre votaciones y observa los votos de los residentes en vivo.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-300" />
                  <span>
                    Quórum Registrado: <strong>{activeAssembly.registeredAttendees} / {activeAssembly.totalProperties}</strong> ({activeAssembly.quorumPercentage}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-300" />
                  <span>Convocada: {activeAssembly.date} a las {activeAssembly.time}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/admin/asambleas/${activeAssembly.id}`)}
              className="px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              Abrir Consola de Conducción
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Assembly List Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Historial y Asambleas Programadas ({assemblies.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assemblies.map((assemb) => (
            <div
              key={assemb.id}
              onClick={() => navigate(`/admin/asambleas/${assemb.id}`)}
              className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      assemb.status === 'IN_PROGRESS'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : assemb.status === 'ENDED'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {assemb.status === 'IN_PROGRESS' ? '🔴 EN CURSO' : assemb.status}
                  </span>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {assemb.date} • {assemb.time}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-[var(--tenant-primary)] transition-colors">
                    {assemb.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {assemb.description || 'Sin descripción adicional.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {assemb.registeredAttendees} / {assemb.totalProperties} ({assemb.quorumPercentage}%)
                  </span>
                  <span>•</span>
                  <span>{assemb.pollsCount} {assemb.pollsCount === 1 ? 'votación' : 'votaciones'}</span>
                </div>

                <span className="text-[var(--tenant-primary)] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Ver consola
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateAssemblyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadAssemblies}
      />
    </div>
  );
};
