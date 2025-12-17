"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { FlowCanvasProps } from "./interface";
import { NODE_TYPES } from "./constant";
import {
  useFlowCanvasController,
  useDropHandler,
  useViewportSynchronizer,
} from "./controller";
import { DropHandler } from "./DropHandler";
import { ViewportSynchronizer } from "./ViewportSynchronizer";

export function FlowCanvas({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeDoubleClick,
  onNodeClick,
  onAddNode,
  viewport,
  onViewportChange,
}: FlowCanvasProps) {
  const {
    nodes,
    edges,
    onConnect,
    handleNodesChange,
    handleEdgesChange,
    handleNodeDragStop,
    handleNodeClick,
    handleNodeDoubleClick,
  } = useFlowCanvasController({
    initialNodes,
    initialEdges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onNodeDoubleClick,
  });

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
        onMoveEnd={(_, vp) => onViewportChange?.(vp)}
        nodeTypes={NODE_TYPES}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        fitView
        className="bg-transparent"
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: {
            strokeWidth: 2,
            stroke: "#94a3b8", // slate-400
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
          },
        }}
        // Performance optimizations
        onlyRenderVisibleElements={true} // Enable for better performance
        selectNodesOnDrag={false}
        panOnDrag={true} // Allow pan with left mouse button when not dragging nodes
        panOnScroll={true} // Allow pan with scroll wheel
        preventScrolling={false}
        // Additional performance settings
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <DropHandler onAddNode={onAddNode} />
        <ViewportSynchronizer viewport={viewport} />
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
