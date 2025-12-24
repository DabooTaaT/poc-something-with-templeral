import { Execution } from "@/lib/types/dag";

export interface ExecutionResultProps {
  execution: Execution | null;
  onClose: () => void;
}


