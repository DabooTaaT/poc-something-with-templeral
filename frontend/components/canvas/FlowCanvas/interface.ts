import { Edge, Viewport } from "reactflow";
import { Node as DAGNode } from "@/lib/types/dag";

export interface FlowCanvasProps {
  nodes?: DAGNode[];
  edges?: Edge[];
  onNodesChange: (nodes: DAGNode[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeDoubleClick?: (node: DAGNode) => void;
  onNodeClick?: (node: DAGNode | null) => void;
  onAddNode?: (
    type: "start" | "http" | "code" | "output",
    position: { x: number; y: number }
  ) => void;
  viewport?: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
}

