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

  // Track node/edge IDs to detect structural changes (add/remove)
  const prevNodeIdsRef = useRef<string>(
    JSON.stringify(initialNodes.map((n) => n.id).sort())
  );
  const prevEdgeIdsRef = useRef<string>(
    JSON.stringify(initialEdges.map((e) => e.id).sort())
  );

  // Sync with parent state only when structure changes (nodes/edges added/removed)
  useEffect(() => {
    const currentNodeIds = JSON.stringify(initialNodes.map((n) => n.id).sort());
    if (currentNodeIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = currentNodeIds;
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    const currentEdgeIds = JSON.stringify(initialEdges.map((e) => e.id).sort());
    if (currentEdgeIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = currentEdgeIds;
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

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
    <div className="w-full h-full">
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
        className="bg-gray-50"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
