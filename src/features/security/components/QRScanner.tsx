import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: Error) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let isMounted = true;
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStream = stream;
        setHasCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error accessing camera:", err);
        setHasCamera(false);
        setError("No se pudo acceder a la cámara. Verifica los permisos.");
        if (onError) onError(err);
      }
    };

    const tick = () => {
      if (!isMounted) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
              onScan(code.data);
              setTimeout(() => {
                if (localStream) localStream.getTracks().forEach(track => track.stop());
                if (videoRef.current && videoRef.current.srcObject) {
                  const s = videoRef.current.srcObject as MediaStream;
                  s.getTracks().forEach(track => track.stop());
                  videoRef.current.srcObject = null;
                }
              }, 500);
              return;
            }
          } catch (e) {
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [onScan, onError]);

  if (hasCamera === false) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
        <CameraOff className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Cámara no disponible</p>
        <p className="text-xs text-slate-500 mt-1">{error || "Verifica los permisos del navegador."}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center aspect-square md:aspect-video border-2 border-slate-200">
      <video 
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute inset-0 z-10 pointer-events-none p-8">
         <div className="w-full h-full border-2 border-emerald-500/80 rounded-xl relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
         </div>
      </div>
    </div>
  );
};
