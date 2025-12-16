"use client";

import { useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { StartNode, HttpNode, OutputNode } from "./CustomNodes";
import { Node as DAGNode } from "@/lib/types/dag";

const nodeTypes: NodeTypes = {
  start: StartNode,
  http: HttpNode,
  output: OutputNode,
};

interface FlowCanvasProps {
  nodes: DAGNode[];
  edges: Edge[];
  onNodesChange: (nodes: DAGNode[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeDoubleClick?: (node: DAGNode) => void;
  onNodeClick?: (node: DAGNode | null) => void;
  onAddNode?: (
    type: "start" | "http" | "output",
    position: { x: number; y: number }
  ) => void;
}

export function FlowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeDoubleClick,
  onNodeClick,
  onAddNode,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Track if we're currently dragging to avoid unnecessary syncs
  const isDraggingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>("");

  // Sync from parent when nodes/edges change (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      // Simple comparison: check if node IDs or data changed (not positions)
      const nodesKey = JSON.stringify(
        initialNodes
          .map((n) => ({ id: n.id, data: n.data }))
          .sort((a, b) => a.id.localeCompare(b.id))
      );

      if (nodesKey !== lastSyncRef.current) {
        lastSyncRef.current = nodesKey;
        setNodes(initialNodes);
      }
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

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

  // Inner component to handle drop with ReactFlow context
  const DropHandler = ({
    onAddNode,
  }: {
    onAddNode?: (
      type: "start" | "http" | "output",
      position: { x: number; y: number }
    ) => void;
  }) => {
    const { screenToFlowPosition } = useReactFlow();

    useEffect(() => {
      const handleDrop = (event: Event) => {
        const dragEvent = event as DragEvent;
        dragEvent.preventDefault();

        const type = dragEvent.dataTransfer?.getData(
          "application/reactflow"
        ) as "start" | "http" | "output";

        // Check if the dropped element is a valid node type
        if (!type || !["start", "http", "output"].includes(type)) {
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

    return null;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        fitView
        className="bg-transparent"
        defaultEdgeOptions={{
          style: { strokeWidth: 2.5 },
          animated: false, // Disable edge animation for better performance
        }}
        // Performance optimizations
        onlyRenderVisibleElements={true} // Enable for better performance
        selectNodesOnDrag={false}
        panOnDrag={[1, 2]} // Allow pan with middle/right mouse button, left button drags nodes
        preventScrolling={false}
        // Additional performance settings
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <DropHandler onAddNode={onAddNode} />
        <Background
          gap={20}
          size={1.5}
          color="#cbd5e1"
          className="opacity-40"
        />
        <Controls
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
          nodeColor={(node) => {
            if (node.type === "start") return "#10b981";
            if (node.type === "http") return "#3b82f6";
            if (node.type === "output") return "#f97316";
            return "#6b7280";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
