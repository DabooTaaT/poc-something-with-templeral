import { WorkflowVersion } from "@/lib/types/dag";

export interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  versions: WorkflowVersion[];
  currentVersion: number;
  isLoading: boolean;
  viewingVersion?: number | null;
  onRestore: (versionNumber: number) => Promise<void>;
  onView: (versionNumber: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

