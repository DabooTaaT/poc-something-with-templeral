"use client";

import { ToastContainerProps } from "./interface";
import { Toast } from "./Toast";
import { TOAST_POSITIONS } from "./constant";
import { useToast } from "./useToast";

export function ToastContainer({
  position = "top-right",
}: ToastContainerProps) {
  const { toasts, removeToast } = useToast();
  const positionClass = TOAST_POSITIONS[position];

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionClass} pointer-events-none`}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
