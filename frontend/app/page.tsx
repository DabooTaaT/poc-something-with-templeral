"use client";

import { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { ExecutionResult } from "@/components/execution/ExecutionResult";
import { Button } from "@/components/ui/Button";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useExecution } from "@/hooks/useExecution";
import { Node } from "@/lib/types/dag";

export default function Home() {
  const {
    nodes,
    edges,
    isLoading,
    error,
    saveWorkflow,
    addNode,
    updateNode,
    deleteNode,
    validate,
    setNodes,
    setEdges,
  } = useWorkflow();

  const { execution, status, runWorkflow, clearExecution } = useExecution();

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showExecutionResult, setShowExecutionResult] = useState(false);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleAddNode = useCallback(
    (type: "start" | "http" | "output") => {
      const position = {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      };
      addNode(type, position);
    },
    [addNode]
  );

  const handleNodeClick = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

  const handleSaveNodeConfig = useCallback(
    (nodeId: string, data: Node["data"]) => {
      updateNode(nodeId, { data });
      setShowConfigPanel(false);
      setSelectedNode(null);
    },
    [updateNode]
  );

  const handleSaveWorkflow = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    try {
      await saveWorkflow(workflowName);
      alert("Workflow saved successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to save workflow: ${errorMessage}`);
    }
  }, [saveWorkflow, workflowName, validate]);

  const handleRunWorkflow = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      alert(`Validation failed: ${validation.errors.join(", ")}`);
      return;
    }
    setValidationErrors([]);

    // Save workflow first if not saved
    let workflowId: string;
    try {
      workflowId = await saveWorkflow(workflowName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to save workflow: ${errorMessage}`);
      return;
    }

    // Run workflow
    try {
      await runWorkflow(workflowId);
      setShowExecutionResult(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to run workflow: ${errorMessage}`);
    }
  }, [saveWorkflow, runWorkflow, workflowName, validate]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      setSelectedNode(null);
    }
  }, [selectedNode, deleteNode]);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-sm shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Workflow Builder
            </h1>
            <p className="text-sm text-gray-600">
              Build and execute workflow DAGs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
            placeholder="Workflow name"
          />
          <Button onClick={handleSaveWorkflow} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={handleRunWorkflow}
            variant="success"
            disabled={isLoading || status === "running"}
          >
            {status === "running" ? "Running..." : "Run"}
          </Button>
        </div>
      </header>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 shadow-sm animate-slide-down">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Validation Errors
              </h3>
              <ul className="mt-2 text-sm text-red-800 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white/90 backdrop-blur-sm border-r border-gray-200/80 p-6 overflow-y-auto shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Nodes
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => handleAddNode("start")}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Node
            </button>
            <button
              onClick={() => handleAddNode("http")}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              HTTP Node
            </button>
            <button
              onClick={() => handleAddNode("output")}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Output Node
            </button>
          </div>

          {selectedNode && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                Selected Node
              </h3>
              <div className="px-3 py-2 bg-gray-50 rounded-lg mb-3">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  {selectedNode.type}
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowConfigPanel(true)}
                  size="sm"
                  className="w-full"
                >
                  Configure
                </Button>
                <Button
                  onClick={handleDeleteSelected}
                  variant="danger"
                  size="sm"
                  className="w-full"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Execution Status */}
          {status !== "idle" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Execution
              </h3>
              <div className="px-3 py-2 bg-gray-50 rounded-lg mb-3">
                <div className="text-xs text-gray-600 flex items-center justify-between">
                  <span>Status:</span>
                  <span
                    className={`font-semibold px-2 py-1 rounded ${
                      status === "completed"
                        ? "bg-green-100 text-green-700"
                        : status === "running"
                        ? "bg-yellow-100 text-yellow-700"
                        : status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
              {execution && (
                <Button
                  onClick={() => setShowExecutionResult(true)}
                  size="sm"
                  className="w-full"
                >
                  View Result
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative">
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
            />
          </ReactFlowProvider>
        </main>
      </div>

      {/* Node Config Panel */}
      {showConfigPanel && selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onSave={handleSaveNodeConfig}
          onClose={() => {
            setShowConfigPanel(false);
            setSelectedNode(null);
          }}
        />
      )}

      {/* Execution Result Modal */}
      {showExecutionResult && execution && (
        <ExecutionResult
          execution={execution}
          onClose={() => {
            setShowExecutionResult(false);
            clearExecution();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white/80 backdrop-blur-sm px-6 py-3 text-sm text-gray-600 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="font-medium">
                Nodes: <span className="text-gray-900">{nodes.length}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="font-medium">
                Edges: <span className="text-gray-900">{edges.length}</span>
              </span>
            </span>
          </div>
          {error && (
            <span className="flex items-center gap-2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Error: {error}</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
