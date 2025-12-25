export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // in milliseconds, default 5000
}

export interface ToastContextType {
  toasts: ToastData[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

export interface ToastContainerProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

