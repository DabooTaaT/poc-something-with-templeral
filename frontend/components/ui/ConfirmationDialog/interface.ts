import { ButtonProps } from "@/components/ui/Button";

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps["variant"];
  cancelVariant?: ButtonProps["variant"];
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions | null;
}

export interface ConfirmationContextType {
  showConfirm: (options: ConfirmationOptions) => void;
}

