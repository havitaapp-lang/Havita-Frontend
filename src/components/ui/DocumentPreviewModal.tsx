import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
  onDownload?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate pr-4">
            {title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <button 
                onClick={onDownload}
                className="p-2 text-slate-500 hover:text-[var(--tenant-primary)] hover:bg-blue-50 rounded-xl transition-colors"
                title="Descargar PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            {fileUrl && (
              <a 
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-500 hover:text-[var(--tenant-primary)] hover:bg-blue-50 rounded-xl transition-colors hidden sm:block"
                title="Abrir en pestaña completa"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button 
              onClick={onClose}
              className="p-2 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-sm transition-colors border border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 bg-slate-200/50 w-full relative">
          {fileUrl ? (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              title={title}
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)] mb-4"></div>
              <p className="text-sm font-semibold">Cargando documento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
