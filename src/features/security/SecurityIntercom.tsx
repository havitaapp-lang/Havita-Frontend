import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Phone, 
  PhoneCall, 
  Building2, 
  Users, 
  History, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PhoneMissed, 
  AlertCircle,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Home,
  Smartphone,
  User
} from 'lucide-react';
import { intercomService } from '../../services/intercomService';
import type { 
  IntercomUnitDirectory, 
  IntercomResidentOption, 
  IntercomCallResponse 
} from '../../services/intercomService';
import { IntercomActiveCallModal } from '../intercom/IntercomActiveCallModal';
import { bindIntercomTrace, createIntercomTrace, markIntercom } from '../intercom/callMetrics';
import { preconnectRealtime } from '../intercom/fastConnect';
import { preInitializeForCall } from '../intercom/earlyPrepare';
import { formatFullUnitPath, formatPhoneCO } from '../../utils/formatters';

// Clean helper to extract structure name (Torre)
const getUnitStructure = (unit: IntercomUnitDirectory): string => {
  if (unit.tower && unit.tower.trim() !== '') return unit.tower.trim();
  if (unit.path) {
    const parts = unit.path.split(/[/->]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  const match = (unit.number || unit.name || '').match(/^(Torre\s*\w+|Bloque\s*\w+|Manzana\s*\w+|Casa\s*\w+)/i);
  if (match) return match[1];
  return 'Torre 1';
};

// Clean helper to extract level / floor
const getUnitLevel = (unit: IntercomUnitDirectory): string => {
  if (unit.level && unit.level.trim() !== '') return unit.level.replace(/Piso\s*/i, '').trim();
  if (unit.floor && unit.floor.trim() !== '') return unit.floor.replace(/Piso\s*/i, '').trim();
  
  const match = (unit.path || unit.number || unit.name || '').match(/Piso\s*(\d+)/i);
  if (match) return match[1];

  return '1';
};

// Clean helper to display apartment name without redundant "Torre 1-Piso 1-"
const getCleanUnitName = (unit: IntercomUnitDirectory): string => {
  const text = unit.name || unit.number || '';
  const match = text.match(/(Apto\s*\w+|Casa\s*\w+|Local\s*\w+)/i);
  if (match) return match[1];

  const parts = text.split(/[-–—/]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return text || 'Unidad';
};

export const SecurityIntercom: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'directory' | 'history'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<IntercomUnitDirectory | null>(null);
  const [activeCall, setActiveCall] = useState<IntercomCallResponse | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 15;

  // Units Directory Query (Loads all units to allow hierarchic tower -> floor -> apto navigation)
  const { 
    data: unitsData, 
    isLoading: isLoadingUnits, 
    isError: isUnitsError 
  } = useQuery({
    queryKey: ['intercom-units'],
    queryFn: () => intercomService.searchUnits('', 0, 500),
    staleTime: 30000,
  });

  // Extract unique structures (Torre 1, Torre 2, etc.)
  const structures = useMemo(() => {
    if (!unitsData?.content) return [];
    const map = new Map<string, number>();
    unitsData.content.forEach((u) => {
      const s = getUnitStructure(u);
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [unitsData?.content]);

  // Group units in selected structure by level/floor
  const unitsByLevel = useMemo(() => {
    if (!selectedStructure || !unitsData?.content) return {};
    const units = unitsData.content.filter((u) => getUnitStructure(u) === selectedStructure);

    const levels: Record<string, IntercomUnitDirectory[]> = {};
    units.forEach((u) => {
      const lvl = getUnitLevel(u);
      if (!levels[lvl]) levels[lvl] = [];
      levels[lvl].push(u);
    });

    // Sort units within each level
    Object.keys(levels).forEach((lvl) => {
      levels[lvl].sort((a, b) =>
        (a.number || a.name || '').localeCompare(b.number || b.name || '', undefined, { numeric: true })
      );
    });

    return levels;
  }, [selectedStructure, unitsData?.content]);

  // Search filtered units across entire complex when searching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !unitsData?.content) return [];
    const query = searchQuery.toLowerCase().trim();
    return unitsData.content.filter((u) =>
      (u.number || '').toLowerCase().includes(query) ||
      (u.name || '').toLowerCase().includes(query) ||
      (u.path || '').toLowerCase().includes(query) ||
      (u.tower || '').toLowerCase().includes(query) ||
      (u.residentNames || []).some((rName) => rName.toLowerCase().includes(query))
    );
  }, [searchQuery, unitsData?.content]);

  // Residents Query for selected unit
  const { 
    data: residents, 
    isLoading: isLoadingResidents 
  } = useQuery({
    queryKey: ['intercom-residents', selectedUnit?.propertyId],
    queryFn: () => (selectedUnit ? intercomService.getUnitResidents(selectedUnit.propertyId) : []),
    enabled: !!selectedUnit,
  });

  // Call History Query with pagination
  const { 
    data: historyData, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['intercom-history', historyPage],
    queryFn: () => intercomService.getHistory(historyPage, HISTORY_PAGE_SIZE),
    enabled: activeTab === 'history',
  });

  // Initiate a call to a selected resident
  const handleInitiateCall = async (resident: IntercomResidentOption) => {
    if (!selectedUnit || isCalling) return;
    setIsCalling(true);
    setErrorMessage(null);
    // P8-A2: la traza empieza al pulsar «Llamar», antes de conocer el callId.
    const trace = createIntercomTrace('CALLER');
    markIntercom(trace, 'CALL_REQUESTED');

    try {
      const call = await intercomService.initiateCall(selectedUnit.propertyId, resident.residentId);
      bindIntercomTrace(trace, call.callId, call.meetingId || call.realtimeMeetingId);
      markIntercom(trace, 'MEETING_CREATED');
      if (call.status === 'RINGING') markIntercom(trace, 'RINGING');
      // P8-A2 (bandera): solo DNS/TLS hacia RealtimeKit mientras timbra; sin init, join ni micrófono.
      preconnectRealtime();
      // P8-A3 (bandera): init del SDK con el token que la portería ya recibe, sin micrófono ni join. La reunión sigue
      // INACTIVE en Cloudflare hasta que el residente acepta.
      if (call.status === 'RINGING') preInitializeForCall(call.callId, call.participantToken, trace);
      const fullPath = formatFullUnitPath(selectedUnit);
      setActiveCall({
        ...call,
        propertyUnit: call.propertyUnit || fullPath,
        propertyTower: call.propertyTower || selectedUnit.tower,
      });
    } catch (err: any) {
      console.error('[SecurityIntercom] Error initiating call:', err);
      setErrorMessage(err.message || 'No se pudo iniciar la llamada con el residente');
    } finally {
      setIsCalling(false);
    }
  };

  // Format seconds to mm:ss
  const formatSeconds = (secs?: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'ENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Finalizada
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rechazada
          </span>
        );
      case 'MISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <PhoneMissed className="w-3 h-3 text-amber-600" />
            No contestó
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Citofonía Digital
              </h1>
              <p className="text-sm text-slate-500">
                Comunícate por audio en tiempo real con los residentes autorizados.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Directorio
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              refetchHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Directory Tab View */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por unidad, torre o nombre de residente (ej. 101, Juan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isLoadingUnits ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200/70 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isUnitsError ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold">Error al cargar el directorio de viviendas</p>
              <p className="text-slate-500 text-sm mt-1">Por favor verifica tu conexión o permisos</p>
            </div>
          ) : searchQuery.trim() ? (
            /* Direct Search Results View */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">
                  Resultados de búsqueda ({searchResults.length})
                </h3>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Volver a vista por torres
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-semibold">No se encontraron apartamentos ni residentes</p>
                  <p className="text-slate-500 text-sm mt-1">Intenta con otro número de unidad o nombre</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {searchResults.map((unit) => {
                    const query = searchQuery.toLowerCase().trim();
                    const matchingResident = (unit.residentNames || []).find((rName) =>
                      rName.toLowerCase().includes(query)
                    );
                    return (
                      <button
                        key={unit.propertyId}
                        onClick={() => setSelectedUnit(unit)}
                        className="p-4 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl transition-all flex flex-col justify-between group cursor-pointer shadow-xs text-left"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700 text-base">
                            {getCleanUnitName(unit)}
                          </span>
                          <Phone className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mb-1">
                          {formatFullUnitPath(unit)}
                        </p>
                        {matchingResident ? (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium truncate mt-0.5">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{matchingResident}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-slate-600">
                            <Users className="w-3 h-3" />
                            <span>{unit.residentCount} hab.</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : !selectedStructure ? (
            /* Step 1: Structures / Towers Grid (Just like PropertySelectorModal) */
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">Torres y Estructuras</h3>
                <p className="text-xs text-slate-500">Selecciona una torre para ver sus pisos y apartamentos</p>
              </div>

              {structures.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-semibold">No hay estructuras registradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {structures.map((str) => (
                    <button
                      key={str.name}
                      onClick={() => setSelectedStructure(str.name)}
                      className="p-6 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl transition-all flex flex-col justify-between group cursor-pointer text-left"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {str.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {str.count} unidades residenciales
                        </p>
                      </div>

                      <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                        <span>Ver pisos y apartamentos</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Selected Tower View Grouped by Floor / Level */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* Back to Towers Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStructure(null)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Volver a las torres"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Apartamentos - {selectedStructure}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Selecciona el apartamento para llamar al citófono
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStructure(null)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer hidden sm:block"
                >
                  Cambiar torre
                </button>
              </div>

              {/* Floors and Apartments */}
              {Object.keys(unitsByLevel).length === 0 ? (
                <div className="py-12 text-center">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-700 font-semibold text-sm">No hay unidades en esta torre</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(unitsByLevel)
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                    .map(([level, units]) => (
                      <div key={level} className="space-y-3">
                        {/* Floor header divider */}
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <span className="h-px bg-slate-200 flex-1"></span>
                          Piso / Nivel {level}
                          <span className="h-px bg-slate-200 flex-1"></span>
                        </h4>

                        {/* Units Grid for this floor */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {units.map((unit) => (
                            <button
                              key={unit.propertyId}
                              onClick={() => setSelectedUnit(unit)}
                              className="p-4 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl transition-all flex flex-col justify-between group cursor-pointer shadow-xs text-left"
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="font-bold text-slate-900 group-hover:text-blue-700 text-base">
                                  {getCleanUnitName(unit)}
                                </span>
                                <Phone className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-slate-600">
                                <Users className="w-3 h-3" />
                                <span>{unit.residentCount} hab.</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab View */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Registro de Llamadas Recientes</h2>
            <button
              onClick={() => refetchHistory()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Actualizar
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : historyData?.content && historyData.content.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {historyData.content.map((item) => (
                <div key={item.callId} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatFullUnitPath({
                            path: item.propertyUnit,
                            propertyUnit: item.propertyUnit,
                            tower: item.propertyTower,
                            number: item.propertyNumber,
                          })}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm font-medium text-slate-700">{item.recipientName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Iniciado por: {item.callerName}</span>
                        {item.createdAt && (
                          <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:self-center self-start">
                    {item.durationSeconds !== undefined && item.durationSeconds > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatSeconds(item.durationSeconds)}
                      </span>
                    )}
                    {renderStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold">No hay llamadas registradas</p>
              <p className="text-slate-500 text-sm mt-1">Las llamadas realizadas aparecerán aquí</p>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoadingHistory && historyData && historyData.totalElements > 0 && (
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
              <div>
                Mostrando{' '}
                <span className="font-semibold text-slate-700">
                  {historyPage * HISTORY_PAGE_SIZE + 1}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, historyData.totalElements)}
                </span>{' '}
                de{' '}
                <span className="font-semibold text-slate-700">
                  {historyData.totalElements}
                </span>{' '}
                llamadas
              </div>

              {historyData.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((prev) => Math.max(0, prev - 1))}
                    disabled={historyPage === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="px-3 py-1 text-xs font-bold text-slate-700">
                    Página {historyPage + 1} de {historyData.totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={() => setHistoryPage((prev) => Math.min(historyData.totalPages - 1, prev + 1))}
                    disabled={historyPage >= historyData.totalPages - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resident Selection Modal for a Selected Unit */}
      {selectedUnit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {formatFullUnitPath(selectedUnit)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Piso {getUnitLevel(selectedUnit)} • Selecciona al habitante para llamar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isLoadingResidents ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : residents && residents.length > 0 ? (
                <div className="space-y-3">
                  {residents.map((resident) => (
                    <div
                      key={resident.residentId}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 transition-colors">
                          {resident.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {resident.fullName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 font-medium">
                              {resident.residentType || 'Residente'}
                            </span>
                            {resident.isPrimaryContact && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                <UserCheck className="w-3 h-3" />
                                Principal
                              </span>
                            )}
                          </div>
                          {resident.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-mono text-slate-700 font-medium">
                                {formatPhoneCO(resident.phone)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleInitiateCall(resident)}
                        disabled={isCalling}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Llamar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-700 font-semibold text-sm">No hay residentes registrados</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Esta unidad no cuenta con citófonos configurados actualmente
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Call Modal Overlay */}
      {activeCall && (
        <IntercomActiveCallModal
          call={activeCall}
          isCaller={true}
          onClose={() => {
            setActiveCall(null);
            setSelectedUnit(null);
            queryClient.invalidateQueries({ queryKey: ['intercom-history'] });
          }}
          onCallUpdated={(updated) => setActiveCall(updated)}
        />
      )}
    </div>
  );
};
