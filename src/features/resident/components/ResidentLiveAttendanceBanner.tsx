import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { assemblyService } from '../../assemblies/services/assemblyService';
import { getActiveDelegation } from '../../../services/votingDelegationService';
import { notificationService } from '../../../services/notificationService';

export const ResidentLiveAttendanceBanner = () => {
  const { user, activePropertyId, userProperties } = useAuth() as any;
  const propertyId = activePropertyId || user?.residentPropertyId;
  const queryClient = useQueryClient();

  // 1. Fetch active assembly — se actualiza por SSE (ASSEMBLY_STARTED / ASSEMBLY_ENDED)
  const { data: activeAssembly } = useQuery({
    queryKey: ['activeAssembly'],
    queryFn: () => assemblyService.getActiveAssembly(),
  });

  // 2. Fetch delegation status
  const { data: delegation } = useQuery({
    queryKey: ['votingDelegation', propertyId],
    queryFn: () => getActiveDelegation(propertyId),
    enabled: !!propertyId
  });

  // 3. Fetch attendees — se actualiza por SSE (ASSEMBLY_QUORUM_UPDATED)
  const { data: attendees } = useQuery({
    queryKey: ['assemblyAttendees', activeAssembly?.id],
    queryFn: () => assemblyService.getAttendees(activeAssembly!.id),
    enabled: !!activeAssembly?.id,
  });

  if (!activeAssembly || !propertyId || !user) return null;

  const currentProp = userProperties?.find((p: any) => p.propertyId === propertyId);
  const residentType = currentProp?.type || '';
  const isOwner = residentType.toLowerCase() === 'propietario';
  const isTenant = residentType.toLowerCase() === 'arrendatario';

  const hasVotingRights = 
    (isOwner && !delegation) || 
    (isTenant && delegation && delegation.delegateUserId === user.id);

  if (!hasVotingRights) return null;

  const hasRegistered = attendees?.some((a: any) => a.propertyId === propertyId);

  if (hasRegistered) return null;

  const handleRegister = async () => {
    try {
      await assemblyService.selfRegisterAttendee(activeAssembly.id, propertyId);
      notificationService.showToast('Asistencia registrada exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['assemblyAttendees', activeAssembly.id] });
    } catch (err: any) {
      notificationService.showToast(err.response?.data?.message || 'Error al registrar asistencia', 'error');
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 shadow-lg animate-fade-in text-white mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">
              Asamblea en Curso
            </span>
          </div>
          <h3 className="font-bold text-lg leading-tight mb-1">
            Confirma tu Asistencia
          </h3>
          <p className="text-blue-100 text-xs">
            {activeAssembly.title}. Tienes el derecho de voto para esta unidad. Regístrate en el quórum.
          </p>
        </div>
        <button
          onClick={handleRegister}
          className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl text-sm flex items-center gap-2 transition-all shrink-0 shadow-sm"
        >
          Presente
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
