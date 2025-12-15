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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
          <p className="text-sm text-gray-600">
            Build and execute workflow DAGs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Validation Errors
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Nodes
          </h2>
          <div className="space-y-3">
            <Button
              onClick={() => handleAddNode("start")}
              variant="success"
              className="w-full"
            >
              + Start Node
            </Button>
            <Button
              onClick={() => handleAddNode("http")}
              variant="primary"
              className="w-full"
            >
              + HTTP Node
            </Button>
            <Button
              onClick={() => handleAddNode("output")}
              variant="secondary"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              + Output Node
            </Button>
          </div>

          {selectedNode && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Selected Node
              </h3>
              <p className="text-xs text-gray-600 mb-3">{selectedNode.type}</p>
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
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Execution
              </h3>
              <div className="text-xs text-gray-600 mb-2">
                Status: <span className="font-semibold">{status}</span>
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
      <footer className="border-t border-gray-200 bg-white px-6 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>
            Nodes: {nodes.length} | Edges: {edges.length}
          </span>
          {error && <span className="text-red-600">Error: {error}</span>}
        </div>
      </footer>
    </div>
  );
}
