import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Evitar loggear datos sensibles del usuario
    console.error('ErrorBoundary capturó un error controlado:', error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-rose-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Ocurrió un error inesperado al renderizar esta sección. No te preocupes, tus datos no se han perdido.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Detalle del problema
              </span>
              <p className="text-xs font-mono text-slate-600 truncate">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={this.handleGoHome}
              >
                <Home className="w-4 h-4" />
                Ir al inicio
              </Button>
              <Button
                className="w-full flex items-center justify-center gap-2 bg-[var(--tenant-primary)] hover:bg-blue-600"
                onClick={this.handleReset}
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
