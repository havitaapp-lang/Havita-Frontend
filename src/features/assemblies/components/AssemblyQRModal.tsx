import { X, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface AssemblyQRModalProps {
  assemblyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AssemblyQRModal = ({ assemblyId, isOpen, onClose }: AssemblyQRModalProps) => {
  if (!isOpen) return null;

  const url = `${window.location.origin}/resident`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">QR de Asistencia</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Escanea para registrarte en el quórum</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <QRCodeSVG
              value={url}
              size={240}
              level="H"
              includeMargin={true}
              className="rounded-xl"
            />
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">Abre la app de Havita o escanea este código</p>
            <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
              El sistema identificará tu propiedad y verificará tus permisos de votación automáticamente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-colors">
             Abrir enlace manualmente <ExternalLink className="w-3.5 h-3.5" />
           </a>
        </div>
      </div>
    </div>
  );
};
