import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { DEFAULT_WHATSAPP_NUMBER, getWhatsAppUrl } from '../config/contactConfig';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = DEFAULT_WHATSAPP_NUMBER,
  defaultMessage = 'Hola, quisiera recibir más información sobre Havita para mi copropiedad.'
}) => {
  const [showTooltip, setShowTooltip] = useState(true);

  const whatsappUrl = phoneNumber === DEFAULT_WHATSAPP_NUMBER 
    ? getWhatsAppUrl(defaultMessage)
    : `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      {/* Tooltip / Bubble */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-100 text-xs text-slate-700 animate-fade-in group">
          <span className="font-semibold text-slate-900">¿Dudas?</span>
          <span>Chatea con un asesor</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-slate-600 ml-1 p-0.5 rounded-full"
            aria-label="Cerrar mensaje"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar a Havita por WhatsApp"
        className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      >
        {/* Radar pulse ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />

        <MessageCircle className="w-7 h-7 fill-white stroke-[#25D366]" />

        {/* Floating badge for small screens */}
        <span className="sr-only">Escríbenos por WhatsApp</span>
      </a>
    </div>
  );
};
