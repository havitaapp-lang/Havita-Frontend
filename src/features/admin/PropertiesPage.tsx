import { useState, useMemo } from 'react';
import { Plus, Upload, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import type { PropertyUnit } from '../../types';
import { propertiesService } from '../../services/propertiesService';
import { notificationService } from '../../services/notificationService';

// Module Components
import { PropertyStatsBar } from './properties/components/PropertyStatsBar';
import { PropertyFiltersBar } from './properties/components/PropertyFiltersBar';
import { StructureGrid } from './properties/components/StructureGrid';
import { StructureDetailView } from './properties/components/StructureDetailView';
import { PropertyListView } from './properties/components/PropertyListView';
import { PropertyDrawer } from './properties/components/PropertyDrawer';
import { PropertyFormModal } from './properties/components/PropertyFormModal';
import { BulkPropertyWizard } from './properties/components/BulkPropertyWizard';
import { ImportPropertiesModal } from './properties/components/ImportPropertiesModal';
import { BulkInvitationModal } from './properties/components/BulkInvitationModal';
import { UserPlus } from 'lucide-react';

export const PropertiesPage = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { properties, createProperty, updateProperty, deleteProperty, deleteStructure } = useData();

  // Tenant-specific properties
  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  // View Mode: 'structure' (default visual) or 'list' (precision table)
  const [viewMode, setViewMode] = useState<'structure' | 'list'>('structure');

  // Drill-down selected structure (e.g. 'Torre 7', 'Bloque A', or null)
  const [selectedStructureName, setSelectedStructureName] = useState<string | null>(null);

  // Selected property for Right Side Drawer
  const [selectedProperty, setSelectedProperty] = useState<PropertyUnit | null>(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');

  // Modal Create / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyUnit | null>(null);

  // Bulk Modals
  const [isBulkWizardOpen, setIsBulkWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkInviteOpen, setIsBulkInviteOpen] = useState(false);

  // Filtered properties based on search and filters
  const filteredProperties = useMemo(() => {
    return tenantProperties.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        (p.residentName && p.residentName.toLowerCase().includes(q)) ||
        (p.structureName && p.structureName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
      const matchesType = typeFilter === 'Todos' || p.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [tenantProperties, searchTerm, statusFilter, typeFilter]);

  // Overall Community Statistics
  const communityStats = useMemo(() => {
    return propertiesService.calculateCommunityStats(tenantProperties);
  }, [tenantProperties]);

  // Structures summary (Torres / Bloques / Manzanas)
  const structures = useMemo(() => {
    return propertiesService.getStructuresSummary(filteredProperties);
  }, [filteredProperties]);

  // Selected structure summary
  const selectedStructureSummary = useMemo(() => {
    if (!selectedStructureName) return undefined;
    return structures.find((s) => s.name.toLowerCase() === selectedStructureName.toLowerCase());
  }, [structures, selectedStructureName]);

  // Handlers
  const handleOpenCreate = (defaultStruct?: string) => {
    if (defaultStruct) {
      setSelectedStructureName(defaultStruct);
    }
    setEditingProperty(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (prop: PropertyUnit) => {
    setEditingProperty(prop);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar propiedad?',
      'Esta acción eliminará la propiedad "' + name + '" del registro de la comunidad.',
      'Sí, eliminar',
      'Cancelar'
    );
    if (confirmed) {
      try {
        await deleteProperty(id);
        if (selectedProperty?.id === id) {
          setSelectedProperty(null);
        }
        notificationService.showToast('Propiedad eliminada', 'success');
      } catch (err: any) {
        notificationService.showError('Error', err.message || err.response?.data?.message || 'No se pudo eliminar la propiedad.');
      }
    }
  };

  const handleDeleteStructure = async (name: string) => {
    const structurePropsCount = properties.filter(p => p.structureName === name).length;
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar Estructura Completa?',
      `Esta acción demolerá "${name}" lógicamente. Se eliminarán en cascada ${structurePropsCount} propiedades asociadas a esta estructura de forma permanente.`,
      'Sí, demoler',
      'Cancelar'
    );
    
    if (confirmed) {
      try {
        await deleteStructure(name);
        notificationService.showToast(`Estructura ${name} eliminada con éxito`, 'success');
        setSelectedStructureName(null);
      } catch (err: any) {
        if (err.message && err.message.includes('STRUCTURE_HAS_RESIDENTS')) {
          notificationService.showError(
            'Operación Bloqueada',
            'No se puede eliminar la estructura porque contiene propiedades con residentes asignados. Traslade o elimine los residentes primero.'
          );
        } else {
          notificationService.showError('Error', err.message || 'No se pudo eliminar la estructura.');
        }
      }
    }
  };

  const handleSaveProperty = async (data: Omit<PropertyUnit, 'id'>) => {
    if (editingProperty) {
      await updateProperty(editingProperty.id, data);
      notificationService.showToast('Propiedad actualizada', 'success');
      // Update drawer if opened
      if (selectedProperty?.id === editingProperty.id) {
        setSelectedProperty({ ...editingProperty, ...data });
      }
    } else {
      await createProperty({
        ...data,
        tenantId,
      });
      notificationService.showToast('Propiedad registrada exitosamente', 'success');
    }
  };

  // Instant direct navigation when search matches a single property exact
  const handleDirectSelect = (prop: PropertyUnit) => {
    setSelectedProperty(prop);
    if (prop.structureName) {
      setSelectedStructureName(prop.structureName);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Propiedades
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Administra torres, bloques, casas y apartamentos de tu comunidad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          <button
            type="button"
            onClick={() => setIsBulkInviteOpen(true)}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Generar Enlace Mltiple</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
  
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Importar Excel</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          
          <button
            type="button"
            onClick={() => setIsBulkWizardOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Crear en lote</span>
            <span className="sm:hidden">Masivo</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva propiedad</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* 2. Community Overview Stats Bar */}
      <PropertyStatsBar stats={communityStats} />

      {/* 3. Controls & View Toggle Bar [ ▦ Estructura ] [ ☷ Lista ] */}
      <PropertyFiltersBar
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          if (mode === 'list') {
            setSelectedStructureName(null);
          }
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {/* Quick Search Match Callout if user searched exact */}
      {searchTerm && filteredProperties.length > 0 && filteredProperties.length <= 3 && (
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-blue-900 font-medium">
              Coincidencias directas encontradas:
            </span>
            <div className="flex items-center gap-1.5">
              {filteredProperties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDirectSelect(p)}
                  className="font-bold underline text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  {p.name} ({p.structureName || 'Torre'})
                </button>
              ))}
            </div>
          </div>
          <span className="text-slate-400 text-[11px]">Haz clic para abrir detalle</span>
        </div>
      )}

      {/* 4. Main Views: Structure Drill-Down or Precision Table */}
      {viewMode === 'structure' ? (
        selectedStructureName ? (
          /* Drill-down inside a specific Tower / Building */
          <StructureDetailView
            structureName={selectedStructureName}
            properties={tenantProperties}
            structureSummary={selectedStructureSummary}
            selectedProperty={selectedProperty}
            onSelectProperty={setSelectedProperty}
            onBack={() => setSelectedStructureName(null)}
            onOpenCreate={() => handleOpenCreate(selectedStructureName)}
            onDeleteStructure={handleDeleteStructure}
          />
        ) : (
          /* Grid of Towers / Buildings */
          <StructureGrid
            structures={structures}
            onSelectStructure={(name) => setSelectedStructureName(name)}
            onOpenCreateModal={() => handleOpenCreate()}
          />
        )
      ) : (
        /* Secondary Precision Table View */
        <PropertyListView
          properties={filteredProperties}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onSelectProperty={setSelectedProperty}
        />
      )}

      {/* 5. Right Side Drawer for Selected Property Detail */}
      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* 6. Create / Edit Property Modal */}
      <PropertyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingProperty={editingProperty}
        defaultStructure={selectedStructureName || 'Torre 1'}
        onSave={handleSaveProperty}
        communityType={currentTenant?.structureType?.includes('Casa') ? 'Manzana' : 'Torre'}
      />

      {/* 7. Bulk Generation Wizard */}
      <BulkPropertyWizard
        isOpen={isBulkWizardOpen}
        onClose={() => setIsBulkWizardOpen(false)}
        onSuccess={() => {
          setIsBulkWizardOpen(false);
          setSelectedStructureName(null);
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          notificationService.showSuccess('Generación Exitosa', 'Las propiedades han sido creadas exitosamente.');
        }}
      />

      {/* 8. Import Excel Modal */}
      
      <ImportPropertiesModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={() => {
          setIsImportModalOpen(false);
          setSelectedStructureName(null);
          queryClient.invalidateQueries({ queryKey: ['properties'] });
        }}
      />
      
      <BulkInvitationModal
        isOpen={isBulkInviteOpen}
        onClose={() => setIsBulkInviteOpen(false)}
      />
  

    </div>
  );
};
