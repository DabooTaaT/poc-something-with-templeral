import { Node, NodeData } from "@/lib/types/dag";

export interface NodeConfigPanelProps {
  node: Node | null;
  onSave: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}

