"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmationOptions } from "./interface";
import {
  DEFAULT_CONFIRM_TEXT,
  DEFAULT_CANCEL_TEXT,
  DEFAULT_TITLE,
} from "./constant";

interface ConfirmationDialogProps {
  isOpen: boolean;
  options: ConfirmationOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  options,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!options) return null;

  const title = options.title ?? DEFAULT_TITLE;
  const confirmText = options.confirmText ?? DEFAULT_CONFIRM_TEXT;
  const cancelText = options.cancelText ?? DEFAULT_CANCEL_TEXT;
  const confirmVariant = options.confirmVariant ?? "primary";
  const cancelVariant = options.cancelVariant ?? "outline";

  const handleConfirm = () => {
    options.onConfirm();
    onConfirm();
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="sm">
      <div className="p-4">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 mb-4">
            <svg
              className="h-6 w-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mb-6">{options.message}</p>
        </div>
        <div className="flex gap-3 sm:grid sm:grid-cols-2">
          <Button
            variant={cancelVariant}
            onClick={handleCancel}
            className="w-full justify-center"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            className="w-full justify-center"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

