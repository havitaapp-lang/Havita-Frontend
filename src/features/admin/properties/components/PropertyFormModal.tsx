import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PropertyUnit } from '../../../../types';
import { FormField } from '../../../../components/ui/FormField';
import { FormErrorSummary } from '../../../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../../../components/ui/SubmitButton';
import { FIELD_LIMITS } from '../../../../validation/rules/limits';
import { normalizeWhitespace } from '../../../../utils/sanitizers';
import { propertySchema } from '../../../../validation/schemas/propertySchema';
import { validateForm } from '../../../../validation/validators/formValidator';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProperty: PropertyUnit | null;
  defaultStructure?: string;
  onSave: (data: Omit<PropertyUnit, 'id'>) => Promise<void>;
  communityType?: string;
}

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  editingProperty,
  defaultStructure = 'Torre 1',
  onSave,
  communityType = 'Torre',
}) => {
  const [formData, setFormData] = useState({
    name: '',
    structureName: defaultStructure,
    level: '1' as string | number,
    number: '',
    type: 'Apartamento' as PropertyUnit['type'],
    status: 'OCCUPIED' as PropertyUnit['status'],
    area: '' as number | '',
    bedrooms: '' as number | '',
    bathrooms: '' as number | '',
    residentName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProperty) {
      setFormData({
        name: editingProperty.name,
        structureName: editingProperty.structureName || defaultStructure,
        level: editingProperty.level ? String(editingProperty.level) : '1',
        number: editingProperty.number || editingProperty.name.replace(/\D/g, '') || '101',
        type: editingProperty.type,
        status: editingProperty.status,
        area: editingProperty.area || '',
        bedrooms: editingProperty.bedrooms || '',
        bathrooms: editingProperty.bathrooms || '',
        residentName: editingProperty.residentName || '',
      });
    } else {
      setFormData({
        name: '',
        structureName: defaultStructure,
        level: '',
        number: '',
        type: communityType === 'Manzana' || communityType === 'Etapa' ? 'Casa' : 'Apartamento',
        status: 'VACANT',
        area: '',
        bedrooms: '',
        bathrooms: '',
        residentName: '',
      });
    }
    setErrors({});
    setErrorList([]);
  }, [editingProperty, defaultStructure, communityType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const levelLabel = /^(piso|nivel|s[oó]tano|etapa)\b/i.test(String(formData.level)) ? formData.level : 'Piso ' + formData.level;
    const path = formData.structureName + ' -> ' + levelLabel + ' -> ' + formData.name;
    const normalized = {
      name: normalizeWhitespace(formData.name),
      path,
      type: formData.type,
      status: formData.status,
    };

    const validation = validateForm(propertySchema, normalized);
    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

      try {
        const generatedNumber = `${formData.structureName.trim()}-${levelLabel}-${formData.name.trim()}`;
        await onSave({
          ...normalized,
          tenantId: editingProperty?.tenantId || '',
          structureName: formData.structureName.trim(),
          structureType: (communityType as any) || 'Torre',
          level: levelLabel,
          number: formData.number?.trim() || generatedNumber,
          area: Number(formData.area) || 0,
          bedrooms: Number(formData.bedrooms) || 0,
          bathrooms: Number(formData.bathrooms) || 0,
          residentName: formData.residentName?.trim() || undefined,
        });
        onClose();
      } catch (err: any) {
        setErrorList([{ field: 'General', message: err.response?.data?.message || err.message || 'Error al guardar la propiedad.' }]);
      } finally {
        setIsSubmitting(false);
      }
    };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingProperty ? 'Editar Propiedad' : 'Registrar Nueva Propiedad'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuración de datos y vinculación estructural en la comunidad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <FormErrorSummary errors={errorList} />

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="prop-struct"
              label="Estructura / Torre / Bloque"
              required
            >
              <input
                id="prop-struct"
                type="text"
                maxLength={FIELD_LIMITS.PROPERTY_NAME_MAX_LENGTH}
                value={formData.structureName}
                onChange={(e) => setFormData({ ...formData, structureName: e.target.value })}
                placeholder="Ej. Torre 1, Bloque A"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white"
              />
            </FormField>

            <FormField
              id="prop-level"
              label="Nivel o Piso"
              required
            >
              <input
                id="prop-level"
                type="text"
                maxLength={20}
                placeholder="ej. Piso 1, Sótano"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="prop-name"
              label="Nomenclatura Completa"
              required
              error={errors.name}
            >
              <input
                id="prop-name"
                type="text"
                maxLength={50}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="Ej. Apto 204 o Casa 12"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white"
              />
            </FormField>

            <FormField
              id="prop-type"
              label="Tipo de Inmueble"
              required
            >
              <select
                id="prop-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white"
              >
                <option value="Apartamento">Apartamento</option>
                <option value="Casa">Casa</option>
                <option value="Local">Local</option>
                <option value="Parqueadero">Parqueadero</option>
                <option value="Depósito">Depósito</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField id="prop-status" label="Estado" required>
              <select
                id="prop-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="OCCUPIED">Ocupado</option>
                <option value="VACANT">Desocupado</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </FormField>

            <FormField id="prop-area" label="Área (m²)">
              <input
                id="prop-area"
                type="number"
                min={10}
                max={999}
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </FormField>

            <FormField id="prop-beds" label="Habitaciones">
              <input
                id="prop-beds"
                type="number"
                min={0}
                max={10}
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </FormField>

            <FormField id="prop-baths" label="Baños">
              <input
                id="prop-baths"
                type="number"
                min={0}
                max={10}
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </FormField>
          </div>

          <FormField
            id="prop-resident"
            label="Residente Asignado"
            maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
            currentLength={formData.residentName.length}
          >
            <input
              id="prop-resident"
              type="text"
              maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
              value={formData.residentName}
              onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
              placeholder="Ej. Carlos Rodríguez"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <SubmitButton
              isSubmitting={isSubmitting}
              loadingText="Guardando..."
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              {editingProperty ? 'Guardar Cambios' : 'Crear Propiedad'}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
};
