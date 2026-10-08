import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { propertiesService } from '../../../../services/propertiesService';
import Swal from 'sweetalert2';

interface ImportPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportPropertiesModal = ({ isOpen, onClose, onSuccess }: ImportPropertiesModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setIsUploading(true);
      await propertiesService.importPropertiesExcel(file);
      onSuccess();
    } catch (err: any) {
      Swal.fire({
        title: 'Error de Importación',
        text: err.message || 'Ocurrió un error al procesar el archivo Excel',
        icon: 'error',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Generate simple dummy CSV for template
    const csv = "Estructura,Nivel,Propiedad,Tipo\nTorre 1,Piso 1,101,Apartamento\nTorre 1,Piso 1,102,Apartamento\nCasa 1,,,Casa";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_propiedades.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">Importar Excel</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-3">
              Descarga la plantilla, diligénciala con las propiedades de tu comunidad y súbela al sistema.
            </p>
            <button 
              onClick={handleDownloadTemplate}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Descargar plantilla .csv
            </button>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="font-semibold text-emerald-800">{file.name}</p>
                <p className="text-xs text-emerald-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={() => setFile(null)}
                  className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <p className="font-semibold text-slate-700">Haz clic para subir tu archivo</p>
                <p className="text-xs text-slate-500 mt-1">Formatos soportados: .csv, .xlsx</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">
            Cancelar
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Procesar e Importar
          </button>
        </div>

      </div>
    </div>
  );
};

