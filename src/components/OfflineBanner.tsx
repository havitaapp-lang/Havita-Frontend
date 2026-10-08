import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>
        Estás en modo sin conexión. Las acciones que requieran sincronización se guardarán localmente.
      </span>
    </div>
  );
};
