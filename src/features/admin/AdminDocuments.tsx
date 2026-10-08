import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Filter, FileText, Download, Edit, Trash2, X, Upload, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import type { CommunityDocument } from '../../types';
import { documentSchema } from '../../validation/schemas/documentSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace, sanitizeText } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { apiClient } from '../../api/apiClient';

const ITEMS_PER_PAGE = 8;

export const AdminDocuments = () => {
  const { currentTenant } = useTenant();
  const { documents, createDocument, updateDocument, deleteDocument, incrementDocumentDownload } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantDocuments = useMemo(() => {
    return documents.filter((d) => d.tenantId === tenantId);
  }, [documents, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CommunityDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Reglamento' as CommunityDocument['category'],
    fileSize: '2.5 MB',
    fileType: 'PDF' as CommunityDocument['fileType'],
    fileName: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{doc: CommunityDocument, objectUrl: string | null} | null>(null);

  const filteredDocs = tenantDocuments.filter(d => {
    const matchesSearch = !searchTerm || 
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === 'Todos' || d.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE) || 1;
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      title: '',
      category: 'Reglamento',
      fileSize: '1.8 MB',
      fileType: 'PDF',
      fileName: 'reglamento_limonar_2026.pdf',
      description: ''
    });
    setErrors({});
    setErrorList([]);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: CommunityDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      fileName: doc.title + '.pdf',
      description: doc.description || ''
    });
    setErrors({});
    setErrorList([]);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tipo de archivo (Solo PDF)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      notificationService.showError('Formato no permitido', 'Únicamente se admiten archivos en formato PDF.');
      e.target.value = '';
      return;
    }

    // Validación de tamaño (Máx 10 MB)
    if (file.size > FIELD_LIMITS.FILES.MAX_DOCUMENT_SIZE_BYTES) {
      notificationService.showError('Archivo muy pesado', 'El archivo no puede superar los 10 MB.');
      e.target.value = '';
      return;
    }

    // Sanitización estricta del nombre (prevenir ../ o caracteres raros)
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.');

    const calculatedMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    setFormData(prev => ({
      ...prev,
      fileName: sanitizedName,
      fileSize: calculatedMb,
      title: prev.title || sanitizeText(file.name.replace(/\.[^/.]+$/, ''))
    }));
    
    setSelectedFile(file);

    notificationService.showToast(`Archivo seleccionado: ${sanitizedName}`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      title: normalizeWhitespace(formData.title),
      category: formData.category,
      description: formData.description ? normalizeWhitespace(formData.description) : '',
    };

    const validation = validateForm(documentSchema, normalized);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      if (!editingDoc && !selectedFile) {
        notificationService.showError('Archivo requerido', 'Debes adjuntar el documento en formato PDF.');
        setIsSubmitting(false);
        return;
      }

      let fileUrl = undefined;
      let storageKey = undefined;

      // Subir archivo al backend si se seleccionó uno
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", selectedFile);
        formDataUpload.append("folder", "documents");
        formDataUpload.append("isPublic", "false");

        const uploadRes = await apiClient.post<any>("/files/upload", formDataUpload);
        if (uploadRes && uploadRes.url) {
          fileUrl = uploadRes.url;
          storageKey = uploadRes.storageKey;
        }
      }

      if (editingDoc) {
        updateDocument(editingDoc.id, {
          title: normalized.title,
          category: normalized.category,
          description: normalized.description,
          fileSize: formData.fileSize,
          fileType: formData.fileType,
          fileUrl,
          storageKey
        });
        notificationService.showToast('Documento actualizado correctamente', 'success');
      } else {
        createDocument({
          title: normalized.title,
          category: normalized.category,
          description: normalized.description,
          fileSize: formData.fileSize,
          fileType: formData.fileType,
          tenantId: currentTenant?.id || 'tenant-limonar',
          fileUrl,
          storageKey
        });
        notificationService.showToast('Documento publicado en repositorio', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible registrar el documento o subir el archivo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar documento?',
      `¿Deseas retirar "${title}" de la biblioteca de la comunidad?`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deleteDocument(id);
      notificationService.showToast('Documento eliminado', 'success');
    }
  };

  const handleDownload = async (doc: CommunityDocument) => {
    incrementDocumentDownload(doc.id);
    if (doc.fileUrl) {
      try {
        notificationService.showToast(`Descargando "${doc.title}"...`, 'info');
        const urlObj = new URL(doc.fileUrl, window.location.origin);
        let endpoint = urlObj.pathname + urlObj.search;
        if (endpoint.startsWith('/api/v1')) {
          endpoint = endpoint.replace('/api/v1', '');
        }
        await apiClient.downloadFile(endpoint, `${doc.title}.pdf`);
      } catch {
        notificationService.showError('Error', 'No se pudo descargar el archivo.');
      }
    } else {
      notificationService.showToast(`Descargando "${doc.title}.pdf"...`, 'info');
    }
  };

  const handlePreview = async (doc: CommunityDocument) => {
    if (doc.fileUrl) {
      try {
        setPreviewDoc({ doc, objectUrl: null });
        const urlObj = new URL(doc.fileUrl, window.location.origin);
        let endpoint = urlObj.pathname + urlObj.search;
        if (endpoint.startsWith('/api/v1')) {
          endpoint = endpoint.replace('/api/v1', '');
        }
        const url = await apiClient.getPreviewUrl(endpoint);
        setPreviewDoc({ doc, objectUrl: url });
      } catch {
        notificationService.showError('Error', 'No se pudo cargar la vista previa.');
        setPreviewDoc(null);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Repositorio de Documentos</h2>
          <p className="text-slate-500 text-sm">Biblioteca oficial de reglamentos, actas de asamblea y balances financieros.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Cargar Documento
        </Button>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/70">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search"
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              placeholder="Buscar documentos por nombre o descripción..." 
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--tenant-primary)]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todas las categorías</option>
              <option value="Reglamento">Reglamento</option>
              <option value="Actas">Actas</option>
              <option value="Financiero">Financiero</option>
              <option value="Convivencia">Convivencia</option>
            </select>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Documento</th>
                <th className="px-6 py-3.5 font-semibold">Categoría</th>
                <th className="px-6 py-3.5 font-semibold">Tamaño / Tipo</th>
                <th className="px-6 py-3.5 font-semibold">Fecha</th>
                <th className="px-6 py-3.5 font-semibold">Descargas</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron documentos registrados.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 max-w-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-snug">{doc.title}</div>
                          {doc.description && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span className="font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        {doc.fileSize} · {doc.fileType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {doc.uploadedAt}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {doc.downloadsCount} descargas
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Previsualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredDocs.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocs.length)} de {filteredDocs.length} documentos
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Cargar / Editar Documento */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDoc ? 'Editar Información de Documento' : 'Cargar Documento Oficial'}
              </h3>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FormErrorSummary errors={errorList} />

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <FormField
                id="doc-title"
                label="Título del documento"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                currentLength={formData.title.length}
                error={errors.title}
              >
                <input
                  id="doc-title"
                  name="title"
                  type="text"
                  maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="Ej. Manual de Convivencia y Régimen Sancionatorio"
                  aria-invalid={Boolean(errors.title)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.title ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <FormField
                id="doc-category"
                label="Categoría"
                required
                error={errors.category}
              >
                <select
                  id="doc-category"
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Reglamento">Reglamento</option>
                  <option value="Actas">Actas</option>
                  <option value="Financiero">Financiero</option>
                  <option value="Convivencia">Convivencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </FormField>

              {/* Archivo PDF con validación y sanitización */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Archivo PDF (Máximo 10 MB)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {formData.fileName && (
                    <div className="mt-2 text-[11px] font-mono text-slate-600 bg-white py-1 px-2.5 rounded-lg border border-slate-200 inline-block">
                      {formData.fileName} ({formData.fileSize})
                    </div>
                  )}
                </div>
              </div>

              <FormField
                id="doc-desc"
                label="Descripción"
                counter={
                  <CharacterCounter
                    current={formData.description.length}
                    max={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                    alwaysVisible
                  />
                }
              >
                <textarea
                  id="doc-desc"
                  name="description"
                  rows={2}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Resumen del contenido del documento..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Cargando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  {editingDoc ? 'Guardar Cambios' : 'Cargar Documento'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => {
          if (previewDoc?.objectUrl) {
            window.URL.revokeObjectURL(previewDoc.objectUrl);
          }
          setPreviewDoc(null);
        }}
        title={previewDoc?.doc.title || ''}
        fileUrl={previewDoc?.objectUrl || null}
        onDownload={() => {
          if (previewDoc) {
            handleDownload(previewDoc.doc);
          }
        }}
      />
    </div>
  );
};
