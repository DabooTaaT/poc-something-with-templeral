import { useState, useEffect, useRef } from "react";
import { VersionHistoryProps } from "./interface";

export function useVersionHistoryController({
  isOpen,
  workflowId,
  onRefresh,
  onRestore,
  onView,
  onClose,
}: VersionHistoryProps) {
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(
    null
  );
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && workflowId && !hasLoadedRef.current) {
      onRefresh();
      hasLoadedRef.current = true;
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workflowId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRestoreClick = (versionNumber: number) => {
    setShowConfirmDialog(versionNumber);
  };

  const handleConfirmRestore = async () => {
    if (showConfirmDialog === null) return;

    setRestoringVersion(showConfirmDialog);
    try {
      await onRestore(showConfirmDialog);
      setShowConfirmDialog(null);
      onClose();
    } catch (error) {
      console.error("Failed to restore version:", error);
      alert("Failed to restore version. Please try again.");
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleCancelRestore = () => {
    setShowConfirmDialog(null);
  };

  const handleViewClick = async (versionNumber: number) => {
    try {
      await onView(versionNumber);
      onClose();
    } catch (error) {
      console.error("Failed to view version:", error);
      alert("Failed to load version. Please try again.");
    }
  };

  return {
    restoringVersion,
    showConfirmDialog,
    formatDate,
    handleRestoreClick,
    handleConfirmRestore,
    handleCancelRestore,
    handleViewClick,
  };
}

