"use client";

import { useConfirmationContext } from "./ConfirmationProvider";

/**
 * Hook to show confirmation dialogs
 *
 * @example
 * ```tsx
 * const { showConfirm } = useConfirm();
 *
 * showConfirm({
 *   message: "Are you sure?",
 *   onConfirm: () => {
 *     // handle confirmation
 *   }
 * });
 * ```
 */
export function useConfirm() {
  return useConfirmationContext();
}

