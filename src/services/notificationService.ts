import Swal, { type SweetAlertIcon } from 'sweetalert2';

/**
 * Configuración global estilizada de SweetAlert2 con la paleta de Havita.
 */
const customSwal = Swal.mixin({
  customClass: {
    confirmButton: 'px-5 py-2.5 rounded-xl font-medium text-white bg-[#1769FF] hover:bg-blue-600 focus:outline-none transition-all mx-1.5 cursor-pointer text-sm shadow-sm',
    cancelButton: 'px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none transition-all mx-1.5 cursor-pointer text-sm',
    popup: 'rounded-2xl p-6 font-sans shadow-xl border border-slate-100',
    title: 'text-lg font-bold text-slate-900',
    htmlContainer: 'text-sm text-slate-600',
  },
  buttonsStyling: false,
});

/**
 * Toast rápido en la esquina superior derecha para feedback no invasivo.
 */
const toastSwal = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  customClass: {
    popup: 'rounded-xl shadow-lg border border-slate-100 text-sm font-medium py-3 px-4',
  },
});

export const notificationService = {
  /**
   * Muestra modal de éxito.
   */
  async showSuccess(title: string, text?: string): Promise<void> {
    await customSwal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Entendido',
    });
  },

  /**
   * Muestra modal de error controlado.
   */
  async showError(title: string, text?: string): Promise<void> {
    await customSwal.fire({
      icon: 'error',
      title,
      text: text || 'Revisa la información e intenta nuevamente.',
      confirmButtonText: 'Cerrar',
      customClass: {
        confirmButton: 'px-5 py-2.5 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 transition-all mx-1.5 cursor-pointer text-sm',
        popup: 'rounded-2xl p-6 font-sans shadow-xl border border-slate-100',
        title: 'text-lg font-bold text-slate-900',
        htmlContainer: 'text-sm text-slate-600',
      },
    });
  },

  /**
   * Muestra modal de advertencia informativa.
   */
  async showWarning(title: string, text?: string): Promise<void> {
    await customSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Aceptar',
    });
  },

  /**
   * Confirmación para acciones destructivas o críticas (Eliminar, Cancelar, Desactivar).
   * Retorna true si el usuario confirmó explícitamente.
   */
  async showConfirm(
    title: string,
    text: string = 'Esta acción no se puede deshacer.',
    confirmButtonText: string = 'Sí, eliminar',
    cancelButtonText: string = 'Cancelar'
  ): Promise<boolean> {
    const result = await customSwal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        confirmButton: 'px-5 py-2.5 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-100 transition-all mx-1.5 cursor-pointer text-sm shadow-sm',
        cancelButton: 'px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none transition-all mx-1.5 cursor-pointer text-sm',
        popup: 'rounded-2xl p-6 font-sans shadow-xl border border-slate-100',
        title: 'text-lg font-bold text-slate-900',
        htmlContainer: 'text-sm text-slate-600',
      },
    });

    return result.isConfirmed;
  },

  /**
   * Muestra toast sutil para operaciones menores ("Paquete registrado", "Copiado al portapapeles").
   */
  showToast(title: string, icon: SweetAlertIcon = 'success'): void {
    toastSwal.fire({
      icon,
      title,
    });
  },

  /**
   * Pide un texto al usuario.
   * Retorna el texto ingresado o null si canceló.
   */
  async showPrompt(
    title: string,
    text?: string,
    placeholder: string = 'Escribe aquí...',
    confirmButtonText: string = 'Aceptar'
  ): Promise<string | null> {
    const result = await customSwal.fire({
      title,
      text,
      input: 'textarea',
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    
    if (result.isConfirmed) {
      return result.value || '';
    }
    return null;
  },
};
