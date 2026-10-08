import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { visitorSettingsService } from '../../../services/visitorSettingsService';
import type { VisitorSettings, VisitorDaySchedule, DayOfWeek, VisitorScheduleMode } from '../../../types/visitorSettings';
import { ORDERED_DAYS, DAY_LABELS } from '../../../types/visitorSettings';
import { notificationService } from '../../../services/notificationService';
import { Clock, CalendarDays, Loader2 } from 'lucide-react';

export const VisitorScheduleSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<VisitorScheduleMode>('HOURS_24');
  const [schedules, setSchedules] = useState<Record<DayOfWeek, VisitorDaySchedule>>({} as any);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await visitorSettingsService.getVisitorSettings();
      setMode(settings.mode);
      
      const defaultSchedules = initializeSchedules();
      if (settings.daySchedules && settings.daySchedules.length > 0) {
        settings.daySchedules.forEach(ds => {
          defaultSchedules[ds.dayOfWeek] = {
            ...ds,
            startTime: ds.startTime || '06:00',
            endTime: ds.endTime || '22:00'
          };
        });
      }
      setSchedules(defaultSchedules);
    } catch (err) {
      notificationService.showToast('No se pudieron cargar los horarios de visita', 'error');
      setSchedules(initializeSchedules());
    } finally {
      setLoading(false);
    }
  };

  const initializeSchedules = (): Record<DayOfWeek, VisitorDaySchedule> => {
    const defaultSch: Partial<Record<DayOfWeek, VisitorDaySchedule>> = {};
    ORDERED_DAYS.forEach(day => {
      defaultSch[day] = {
        dayOfWeek: day,
        enabled: true,
        startTime: '06:00',
        endTime: '22:00'
      };
    });
    return defaultSch as Record<DayOfWeek, VisitorDaySchedule>;
  };

  const handleToggleMode = (newMode: VisitorScheduleMode) => {
    setMode(newMode);
  };

  const handleToggleDay = (day: DayOfWeek) => {
    setSchedules(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const handleTimeChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    // Validar horarios antes de enviar
    if (mode === 'CUSTOM') {
      const invalidDays = ORDERED_DAYS.filter(day => {
        const sch = schedules[day];
        if (sch.enabled) {
          if (!sch.startTime || !sch.endTime) return true;
          if (sch.startTime >= sch.endTime) return true;
        }
        return false;
      });

      if (invalidDays.length > 0) {
        const dayNames = invalidDays.map(d => DAY_LABELS[d]).join(', ');
        notificationService.showError('Horario inválido', `La hora inicial debe ser menor a la hora final en los días: ${dayNames}`);
        return;
      }
    }

    try {
      setSaving(true);
      const payloadDaySchedules = ORDERED_DAYS.map(day => ({
        dayOfWeek: day,
        enabled: schedules[day].enabled,
        startTime: schedules[day].enabled ? schedules[day].startTime : null,
        endTime: schedules[day].enabled ? schedules[day].endTime : null,
      }));

      await visitorSettingsService.updateVisitorSettings({
        mode,
        daySchedules: payloadDaySchedules
      });
      notificationService.showToast('Horarios de visita guardados correctamente', 'success');
    } catch (err) {
      notificationService.showToast('Error al guardar horarios de visita', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-slate-200/80 rounded-2xl shadow-sm bg-white overflow-hidden flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-sm bg-white overflow-hidden animate-fade-in relative">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          <CardTitle className="text-base font-bold text-slate-900">Horarios de Visitas</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Define cuándo los residentes pueden registrar visitas para ingresar al conjunto.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        
        {/* Selector de modo */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 max-w-lg mx-auto lg:mx-0">
          <button
            onClick={() => handleToggleMode('HOURS_24')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              mode === 'HOURS_24' 
                ? 'bg-white shadow-sm border border-slate-200 text-slate-900' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Clock className={`w-4 h-4 ${mode === 'HOURS_24' ? 'text-blue-500' : ''}`} />
            Disponible 24 horas
          </button>
          
          <button
            onClick={() => handleToggleMode('CUSTOM')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              mode === 'CUSTOM' 
                ? 'bg-white shadow-sm border border-slate-200 text-slate-900' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${mode === 'CUSTOM' ? 'text-[var(--tenant-primary)]' : ''}`} />
            Horario Personalizado
          </button>
        </div>

        {/* Formulario Custom */}
        {mode === 'CUSTOM' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 px-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <div className="col-span-4 sm:col-span-3">Día</div>
              <div className="col-span-8 sm:col-span-9 pl-2">Horario Permitido</div>
            </div>
            
            {ORDERED_DAYS.map((day) => {
              const sch = schedules[day];
              return (
                <div key={day} className="grid grid-cols-12 gap-4 items-center p-2 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={sch.enabled}
                        onChange={() => handleToggleDay(day)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--tenant-primary)]"></div>
                    </label>
                    <span className={`text-sm font-semibold ${sch.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                      {DAY_LABELS[day]}
                    </span>
                  </div>
                  
                  <div className="col-span-8 sm:col-span-9 flex items-center gap-2 sm:gap-4 flex-wrap">
                    {sch.enabled ? (
                      <>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                          <input 
                            type="time" 
                            className="text-xs font-mono font-medium text-slate-700 p-2 outline-none w-24 bg-transparent"
                            value={sch.startTime || ''}
                            onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                            required
                          />
                        </div>
                        <span className="text-slate-400 font-bold text-xs">—</span>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                          <input 
                            type="time" 
                            className="text-xs font-mono font-medium text-slate-700 p-2 outline-none w-24 bg-transparent"
                            value={sch.endTime || ''}
                            onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                        No permitido ✕
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl px-6 py-2.5 shadow-sm font-bold text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar Horarios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
