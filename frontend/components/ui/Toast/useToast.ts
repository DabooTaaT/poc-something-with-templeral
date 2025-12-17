"use client";

import { useToastContext } from "./ToastProvider";

/**
 * Hook to show toast notifications
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError } = useToast();
 * 
 * showSuccess("Workflow saved successfully!");
 * showError("Failed to save workflow");
 * ```
 */
export function useToast() {
  return useToastContext();
}

