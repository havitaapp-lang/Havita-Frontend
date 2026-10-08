import React, { useState, useEffect } from "react";
import { X, Copy, QrCode, Smartphone, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { notificationService } from "../../../../services/notificationService";
import { residentInvitationService } from "../../../../services/residentInvitationService";
import type { ResidentInvitationResponse } from "../../../../services/residentInvitationService";
import type { PropertyUnit } from "../../../../types";
import { useTenant } from "../../../../contexts/TenantContext";
import { useData } from "../../../../contexts/DataContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyUnit;
}

export const ResidentInvitationModal: React.FC<Props> = ({ isOpen, onClose, property }) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<ResidentInvitationResponse[]>([]);
  const { properties } = useData();
  const [additionalIds, setAdditionalIds] = useState<string[]>([]);
  const [showMultiSelect, setShowMultiSelect] = useState(false);

  useEffect(() => {
    if (isOpen && property.id && !property.id.toString().includes("-")) {
      // Assuming real property IDs have hyphens (UUID). If its a fake one from mock, we cant invite.
    }
    if (isOpen && property.id && property.id.toString().includes("-")) {
      loadInvitations();
    } else if (isOpen) {
      setInvitations([]);
      setAdditionalIds([]);
      setShowMultiSelect(false);
    }
  }, [isOpen, property]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await residentInvitationService.listInvitations(property.id);
      setInvitations(data.filter(inv => inv.status === "PENDING"));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const newInv = await residentInvitationService.generateInvitation(property.id, additionalIds);
      setInvitations([newInv]);
      notificationService.showToast("Invitacion generada con exito", "success");
    } catch (err: any) {
      notificationService.showError("Error", err.message || "No se pudo generar la invitacion");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      setLoading(true);
      await residentInvitationService.revokeInvitation(id);
      setInvitations(invitations.filter(i => i.id !== id));
      notificationService.showToast("Invitacion revocada", "success");
    } catch (err: any) {
      notificationService.showError("Error", err.message || "No se pudo revocar la invitacion");
      setLoading(false);
    }
  };

  const activeInv = invitations[0];

  const handleCopy = () => {
    if (!activeInv?.link) return;
    navigator.clipboard.writeText(activeInv.link);
    notificationService.showToast("Enlace copiado", "success");
  };

  const handleWhatsApp = () => {
    if (!activeInv?.link) return;
    const text = `Hola, puedes registrarte en Havita mediante este enlace:\n\n${activeInv.link}\n\nEste enlace corresponde a tu vivienda (${property.name}) en ${currentTenant?.name}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Invitar Residente</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div className="text-sm font-semibold text-slate-500 mb-1">{property.structureName || ""}</div>
            <div className="text-xl font-bold text-slate-900">{property.name}</div>
          </div>

          {!property.id || !property.id.toString().includes("-") ? (
            <div className="text-center p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm">
              Esta propiedad es de demostracion (ID invalido). No se pueden generar invitaciones reales.
            </div>
          ) : activeInv ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Invitacion Pendiente
                </div>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm inline-block">
                    <QRCodeSVG value={activeInv.link || ""} size={160} level="H" includeMargin={false} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Pide al residente que escanee este QR o enviale el enlace directamente.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors">
                    <Copy className="w-4 h-4" /> Copiar
                  </button>
                  <button onClick={handleWhatsApp} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors">
                    <Smartphone className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button onClick={() => handleRevoke(activeInv.id)} disabled={loading} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center justify-center gap-1 w-full p-2">
                    <X className="w-3.5 h-3.5" /> Revocar esta invitacion
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Generar Enlace Seguro</h3>
              <p className="text-sm text-slate-500 mb-6">
                Crea un enlace unico y seguro para que el residente se registre directamente en esta vivienda. No tendra que seleccionar bloque ni apartamento.
              </p>
              <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                Generar Invitacion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

