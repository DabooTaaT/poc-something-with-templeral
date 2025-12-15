"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
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
}

export function FlowCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeDoubleClick,
  onNodeClick,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // Sync from parent when any node/edge changes (including data/position)
  const nodesSignature = useMemo(() => JSON.stringify(initialNodes), [initialNodes]);
  const edgesSignature = useMemo(() => JSON.stringify(initialEdges), [initialEdges]);
  const prevNodesSigRef = useRef<string>(nodesSignature);
  const prevEdgesSigRef = useRef<string>(edgesSignature);

  useEffect(() => {
    if (nodesSignature !== prevNodesSigRef.current) {
      prevNodesSigRef.current = nodesSignature;
      setNodes(initialNodes);
    }
  }, [nodesSignature, initialNodes, setNodes]);

  useEffect(() => {
    if (edgesSignature !== prevEdgesSigRef.current) {
      prevEdgesSigRef.current = edgesSignature;
      setEdges(initialEdges);
    }
  }, [edgesSignature, initialEdges, setEdges]);

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
      // Calculate updated nodes first
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Update React Flow's internal state
      onNodesChangeInternal(changes);

      // Sync to parent state
      onNodesChange(updatedNodes as DAGNode[]);
    },
    [nodes, onNodesChange, onNodesChangeInternal]
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
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        fitView
        className="bg-transparent"
        defaultEdgeOptions={{
          style: { strokeWidth: 2.5 },
          animated: true,
        }}
      >
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
