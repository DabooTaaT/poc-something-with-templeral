"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ConfirmationOptions, ConfirmationContextType } from "./interface";
import { ConfirmationDialog } from "./ConfirmationDialog";

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined
);

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({
  children,
}: ConfirmationProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);

  const showConfirm = useCallback((newOptions: ConfirmationOptions) => {
    setOptions(newOptions);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmationDialog
        isOpen={isOpen}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmationContext() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error(
      "useConfirm must be used within a ConfirmationProvider"
    );
  }
  return context;
}

