import { useCallback, useEffect, useRef } from "react";
import {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  Viewport,
} from "reactflow";
import { Node as DAGNode } from "@/lib/types/dag";
import { FlowCanvasProps } from "./interface";

export interface UseFlowCanvasControllerProps {
  initialNodes: DAGNode[];
  initialEdges: Edge[];
  onNodesChange: FlowCanvasProps["onNodesChange"];
  onEdgesChange: FlowCanvasProps["onEdgesChange"];
  onNodeClick?: FlowCanvasProps["onNodeClick"];
  onNodeDoubleClick?: FlowCanvasProps["onNodeDoubleClick"];
}

export function useFlowCanvasController({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
}: UseFlowCanvasControllerProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Track if we're currently dragging to avoid unnecessary syncs
  const isDraggingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNodesKeyRef = useRef<string>("");
  const lastEdgesKeyRef = useRef<string>("");

  // Sync from parent when nodes/edges change (but not during drag)
  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    // Create a stable key for comparison - include data to detect data changes
    const nodesKey = JSON.stringify(
      initialNodes.map((n) => ({
        id: n.id,
        type: n.type,
        x: n.position.x,
        y: n.position.y,
        data: n.data, // Include data to detect changes
      }))
    );

    if (nodesKey !== lastNodesKeyRef.current) {
      lastNodesKeyRef.current = nodesKey;
      // Use setTimeout to ensure this happens after any drag operations
      setTimeout(() => {
        if (!isDraggingRef.current) {
          setNodes(initialNodes);
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes]);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    // Create a stable key for comparison
    const edgesKey = JSON.stringify(
      initialEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
    );

    if (edgesKey !== lastEdgesKeyRef.current) {
      lastEdgesKeyRef.current = edgesKey;
      // Use setTimeout to ensure this happens after any drag operations
      setTimeout(() => {
        if (!isDraggingRef.current) {
          setEdges(initialEdges);
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdges]);

  // Optimized sync to parent - only sync on drag end, not during drag
  const syncNodesToParent = useCallback(
    (updatedNodes: Node[]) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Reduced debounce for better responsiveness
      syncTimeoutRef.current = setTimeout(() => {
        onNodesChange(updatedNodes as DAGNode[]);
        isDraggingRef.current = false;
      }, 50); // Reduced from 150ms to 50ms
    },
    [onNodesChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      onEdgesChange(newEdge);
    },
    [edges, setEdges, onEdgesChange]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check if this is a drag operation
      const dragChange = changes.find(
        (change) => change.type === "position" && change.dragging !== undefined
      );

      if (dragChange && dragChange.type === "position") {
        isDraggingRef.current = dragChange.dragging === true;
      }

      // Apply changes to internal state immediately for smooth dragging
      onNodesChangeInternal(changes);

      // Calculate updated nodes
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Only sync to parent if not dragging, or if drag just ended
      if (!isDraggingRef.current) {
        // Immediate sync for non-drag changes (selection, etc.)
        onNodesChange(updatedNodes as DAGNode[]);
      } else {
        // Debounced sync for drag operations (only during drag, not every frame)
        syncNodesToParent(updatedNodes);
      }
    },
    [nodes, onNodesChange, onNodesChangeInternal, syncNodesToParent]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Calculate updated edges first
      const updatedEdges = applyEdgeChanges(changes, edges);

      // Update React Flow's internal state
      onEdgesChangeInternal(changes);

      // Sync to parent state
      onEdgesChange(updatedEdges);
    },
    [edges, onEdgesChange, onEdgesChangeInternal]
  );

  // Handle drag end - sync immediately
  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      isDraggingRef.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      // Immediate sync on drag end
      const updatedNodes = nodes.map((n) => (n.id === node.id ? node : n));
      onNodesChange(updatedNodes as DAGNode[]);
    },
    [nodes, onNodesChange]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node as DAGNode);
    },
    [onNodeClick]
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeDoubleClick?.(node as DAGNode);
    },
    [onNodeDoubleClick]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    nodes,
    edges,
    onConnect,
    handleNodesChange,
    handleEdgesChange,
    handleNodeDragStop,
    handleNodeClick,
    handleNodeDoubleClick,
  };
}

export function useDropHandler(
  onAddNode?: FlowCanvasProps["onAddNode"]
) {
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handleDrop = (event: Event) => {
      const dragEvent = event as DragEvent;
      dragEvent.preventDefault();

      const type = dragEvent.dataTransfer?.getData(
        "application/reactflow"
      ) as "start" | "http" | "code" | "output";

      // Check if the dropped element is a valid node type
      if (!type || !["start", "http", "code", "output"].includes(type)) {
        return;
      }

      // Convert screen position to flow position
      const position = screenToFlowPosition({
        x: dragEvent.clientX,
        y: dragEvent.clientY,
      });

      // Call the onAddNode callback if provided
      if (onAddNode) {
        onAddNode(type, position);
      }
    };

    const handleDragOver = (event: Event) => {
      const dragEvent = event as DragEvent;
      dragEvent.preventDefault();
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = "move";
      }
    };

    // Wait for ReactFlow to render, then attach listeners
    const attachListeners = () => {
      const pane = document.querySelector(".react-flow__pane");
      if (pane) {
        pane.addEventListener("drop", handleDrop);
        pane.addEventListener("dragover", handleDragOver);
        return pane;
      }
      return null;
    };

    // Try to attach immediately
    let pane = attachListeners();

    // If not found, wait a bit and try again
    if (!pane) {
      const timeoutId = setTimeout(() => {
        pane = attachListeners();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (pane) {
          pane.removeEventListener("drop", handleDrop);
          pane.removeEventListener("dragover", handleDragOver);
        }
      };
    }

    return () => {
      if (pane) {
        pane.removeEventListener("drop", handleDrop);
        pane.removeEventListener("dragover", handleDragOver);
      }
    };
  }, [onAddNode, screenToFlowPosition]);
}

export function useViewportSynchronizer(viewport?: Viewport) {
  const instance = useReactFlow();

  useEffect(() => {
    if (viewport) {
      instance.setViewport(viewport, { duration: 0 });
    }
  }, [instance, viewport]);
}


