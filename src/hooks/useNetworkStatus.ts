import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notificationService.showToast('Conexión restaurada', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      notificationService.showToast('Sin conexión a internet', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
