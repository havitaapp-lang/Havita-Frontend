import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Edit } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { CommonZone } from '../../types';
import { FormField } from '../../components/ui/FormField';
import { notificationService } from '../../services/notificationService';
import { apiClient } from '../../api/apiClient';

export interface AdminCommonZonesTabRef {
  openCreateModal: () => void;
}

export const AdminCommonZonesTab = forwardRef<AdminCommonZonesTabRef, {}>((props, ref) => {
  const { commonZones, fetchCommonZones } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<CommonZone | null>(null);
  
  // Días de la semana
  const weekDays = [
    { id: 'MONDAY', label: 'Lunes' },
    { id: 'TUESDAY', label: 'Martes' },
    { id: 'WEDNESDAY', label: 'Miércoles' },
    { id: 'THURSDAY', label: 'Jueves' },
    { id: 'FRIDAY', label: 'Viernes' },
    { id: 'SATURDAY', label: 'Sábado' },
    { id: 'SUNDAY', label: 'Domingo' }
  ];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 10,
    reservationRequired: true,
    status: 'ACTIVE',
    disabledMessage: '',
    disabledDays: [] as string[],
    openTime: '08:00',
    closeTime: '20:00'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormData({
      name: '',
      description: '',
      capacity: 10,
      reservationRequired: true,
      status: 'ACTIVE',
      disabledMessage: '',
      disabledDays: [],
      openTime: '08:00',
      closeTime: '20:00'
    });
    setIsModalOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openCreateModal: handleOpenCreate
  }));

  const handleOpenEdit = (zone: CommonZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      capacity: zone.capacity,
      reservationRequired: zone.reservationRequired,
      status: zone.status,
      disabledMessage: zone.disabledMessage || '',
      disabledDays: zone.disabledDays ? zone.disabledDays.split(',').map(d => d.trim()).filter(Boolean) : [],
      openTime: zone.openTime || '08:00',
      closeTime: zone.closeTime || '20:00'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        disabledDays: [...formData.disabledDays].sort((a, b) => {
          const idxA = weekDays.findIndex(w => w.id === a);
          const idxB = weekDays.findIndex(w => w.id === b);
          return idxA - idxB;
        }).join(','),
        costPerHour: 0,
        rules: ''
      };

      if (editingZone) {
        await apiClient.put(`/properties/zones/${editingZone.id}`, payload);
        notificationService.showToast('Zona actualizada', 'success');
      } else {
        await apiClient.post(`/properties/zones`, payload);
        notificationService.showToast('Zona creada', 'success');
      }
      setIsModalOpen(false);
      // Fetch data properly to avoid layout jump
      await fetchCommonZones();
    } catch (err) {
      notificationService.showError('Error', 'No se pudo guardar la zona común.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setFormData(prev => ({
      ...prev,
      disabledDays: prev.disabledDays.includes(dayId)
        ? prev.disabledDays.filter(d => d !== dayId)
        : [...prev.disabledDays, dayId]
    }));
  };

  return (
    <div className="space-y-4">

      {commonZones.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-500">No hay zonas comunes configuradas.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {commonZones.map(zone => (
          <Card key={zone.id} className="p-4 rounded-2xl border shadow-xs relative">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-900">{zone.name}</h4>
              <button onClick={() => handleOpenEdit(zone)} className="text-slate-400 hover:text-blue-600">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Capacidad:</span>
                <span className="font-medium text-slate-900">{zone.capacity} pax</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Horario:</span>
                <span className="font-medium text-slate-900">{zone.openTime || '08:00'} - {zone.closeTime || '20:00'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estado:</span>
                {zone.status === 'ACTIVE' ? (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full">Activo</span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 px-2 rounded-full">En Mantenimiento</span>
                )}
              </div>
              {zone.disabledDays && zone.disabledDays.trim() !== '' && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <span className="block text-slate-500 mb-1">Días bloqueados:</span>
                  <div className="flex flex-wrap gap-1">
                    {zone.disabledDays.split(',').map(d => d.trim()).filter(Boolean)
                      .sort((a, b) => {
                        const idxA = weekDays.findIndex(w => w.id === a);
                        const idxB = weekDays.findIndex(w => w.id === b);
                        return idxA - idxB;
                      })
                      .map(d => (
                      <span key={d} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold">
                        {weekDays.find(w => w.id === d)?.label || d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold mb-4">{editingZone ? 'Editar Zona' : 'Nueva Zona'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              <FormField
                id="z-name"
                label="Nombre de la zona"
                required
                maxLength={100}
                currentLength={formData.name.length}
              >
                <input 
                  id="z-name"
                  type="text" 
                  maxLength={100}
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value.slice(0, 100)})} 
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
                  required 
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField id="z-cap" label="Aforo Máximo" required>
                  <input 
                    id="z-cap"
                    type="number" 
                    value={formData.capacity} 
                    onChange={e => setFormData({...formData, capacity: Math.max(1, Number(e.target.value))})} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
                    required 
                    min="1"
                    max="500"
                  />
                </FormField>

                <FormField id="z-status" label="Estado" required>
                  <select 
                    id="z-status"
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ACTIVE">Activa</option>
                    <option value="INACTIVE">Inactiva (Mantenimiento)</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="z-desc"
                label="Descripción"
                maxLength={500}
                currentLength={(formData.description || '').length}
                alwaysShowCounter
              >
                <textarea 
                  id="z-desc"
                  maxLength={500}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value.slice(0, 500)})} 
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-100" 
                  rows={2}
                />
              </FormField>

              {formData.status === 'INACTIVE' && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 space-y-2">
                  <FormField
                    id="z-msg"
                    label="Mensaje de cierre (Visible para residentes)"
                    maxLength={255}
                    currentLength={(formData.disabledMessage || '').length}
                  >
                    <input 
                      id="z-msg"
                      type="text" 
                      maxLength={255}
                      placeholder="Ej. Cerrada por mantenimiento correctivo"
                      value={formData.disabledMessage} 
                      onChange={e => setFormData({...formData, disabledMessage: e.target.value.slice(0, 255)})} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200" 
                    />
                  </FormField>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField id="z-open" label="Hora Apertura" required>
                  <input 
                    id="z-open"
                    type="time" 
                    value={formData.openTime} 
                    onChange={e => setFormData({...formData, openTime: e.target.value})} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white" 
                    required 
                  />
                </FormField>
                <FormField id="z-close" label="Hora Cierre" required>
                  <input 
                    id="z-close"
                    type="time" 
                    value={formData.closeTime} 
                    onChange={e => setFormData({...formData, closeTime: e.target.value})} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white" 
                    required 
                  />
                </FormField>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-2">
                  Días de Mantenimiento (No se puede reservar)
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map(day => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        formData.disabledDays.includes(day.id) 
                          ? 'bg-rose-100 border-rose-200 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-xl">
                  {isSubmitting ? 'Guardando...' : 'Guardar Zona'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
});
