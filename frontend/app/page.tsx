"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Viewport } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { ExecutionResult } from "@/components/execution/ExecutionResult";
import { Button } from "@/components/ui/Button";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useExecution } from "@/hooks/useExecution";
import { Node, Edge, WorkflowSummary } from "@/lib/types/dag";
import { apiClient } from "@/lib/api/client";

const DEFAULT_HISTORY_LIMIT = 20;
const DRAFT_WORKFLOW_ID = "__draft__";
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const createSnapshot = (name: string, nodes: Node[], edges: Edge[]) =>
  JSON.stringify({
    name,
    nodes,
    edges,
  });

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) {
    return "—";
  }
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const statusClassMap: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  RUNNING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function Home() {
  const {
    workflow,
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
    loadWorkflow,
    reset,
  } = useWorkflow();

  const { execution, status, runWorkflow, clearExecution, pollExecution } =
    useExecution();

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showExecutionResult, setShowExecutionResult] = useState(false);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [isWorkflowNameDirty, setIsWorkflowNameDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<WorkflowSummary[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(DEFAULT_HISTORY_LIMIT);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [viewportCache, setViewportCache] = useState<Record<string, Viewport>>({
    [DRAFT_WORKFLOW_ID]: DEFAULT_VIEWPORT,
  });
  const [lastPersistedSnapshot, setLastPersistedSnapshot] = useState<string>(
    () => createSnapshot("My Workflow", [], [])
  );

  const workflowKey = workflow?.id ?? DRAFT_WORKFLOW_ID;
  const activeViewport = viewportCache[workflowKey];
  const currentSnapshot = useMemo(
    () => createSnapshot(workflowName, nodes, edges),
    [workflowName, nodes, edges]
  );
  const hasUnsavedChanges = currentSnapshot !== lastPersistedSnapshot;
  const hasMoreHistory = historyItems.length < historyTotal;

  const fetchHistory = useCallback(
    async ({
      offset = 0,
      append = false,
    }: { offset?: number; append?: boolean } = {}) => {
      const isLoadMore = offset > 0;
      if (isLoadMore) {
        setIsHistoryLoadingMore(true);
      } else {
        setIsHistoryLoading(true);
      }
      setHistoryError(null);
      try {
        const response = await apiClient.listWorkflows({
          limit: historyLimit,
          offset,
        });
        setHistoryItems((prev) =>
          append ? [...prev, ...response.items] : response.items
        );
        setHistoryTotal(response.total);
        setHistoryLimit(response.limit ?? historyLimit);
        setHistoryOffset(response.offset ?? offset);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load workflow history";
        setHistoryError(errorMessage);
      } finally {
        if (isLoadMore) {
          setIsHistoryLoadingMore(false);
        } else {
          setIsHistoryLoading(false);
        }
      }
    },
    [historyLimit]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (workflow?.name && !isWorkflowNameDirty) {
      setWorkflowName(workflow.name);
    }
  }, [workflow?.id, workflow?.name, isWorkflowNameDirty]);

  useEffect(() => {
    if (workflow?.id) {
      setSelectedHistoryId(workflow.id);
    }
  }, [workflow?.id]);

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      fetchHistory();
    }
  }, [status, fetchHistory]);

  const handleAddNode = useCallback(
    (
      type: "start" | "http" | "output",
      position?: { x: number; y: number }
    ) => {
      const nodePosition = position || {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      };
      addNode(type, nodePosition);
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

  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      setSelectedNode(null);
    }
  }, [selectedNode, deleteNode]);

  const handleWorkflowNameChange = useCallback((value: string) => {
    setWorkflowName(value);
    setIsWorkflowNameDirty(true);
  }, []);

  const handleSaveWorkflow = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    try {
      const savedId = await saveWorkflow(workflowName);
      setLastPersistedSnapshot(currentSnapshot);
      setIsWorkflowNameDirty(false);
      setSelectedHistoryId(savedId);
      await fetchHistory({ offset: 0, append: false });
      alert("Workflow saved successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to save workflow: ${errorMessage}`);
    }
  }, [currentSnapshot, fetchHistory, saveWorkflow, validate, workflowName]);

  const handleRunWorkflow = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      alert(`Validation failed: ${validation.errors.join(", ")}`);
      return;
    }
    setValidationErrors([]);

    let workflowId: string;
    try {
      workflowId = await saveWorkflow(workflowName);
      setLastPersistedSnapshot(currentSnapshot);
      setIsWorkflowNameDirty(false);
      setSelectedHistoryId(workflowId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to save workflow: ${errorMessage}`);
      return;
    }

    try {
      await runWorkflow(workflowId);
      setShowExecutionResult(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to run workflow: ${errorMessage}`);
    }
  }, [currentSnapshot, runWorkflow, saveWorkflow, validate, workflowName]);

  const handleRunWorkflowFromHistory = useCallback(
    async (workflowId: string) => {
      try {
        await runWorkflow(workflowId);
        setSelectedHistoryId(workflowId);
        setShowExecutionResult(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        alert(`Failed to run workflow: ${errorMessage}`);
      }
    },
    [runWorkflow]
  );

  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      const key = workflow?.id ?? DRAFT_WORKFLOW_ID;
      setViewportCache((prev) => ({
        ...prev,
        [key]: viewport,
      }));
    },
    [workflow?.id]
  );

  const handleEditWorkflow = useCallback(
    async (workflowId: string) => {
      if (workflowId === workflow?.id) {
        return;
      }
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          "You have unsaved changes. Continue without saving?"
        );
        if (!confirmed) {
          return;
        }
      }

      setSelectedHistoryId(workflowId);
      const loaded = await loadWorkflow(workflowId);
      if (!loaded) {
        return;
      }

      setWorkflowName(loaded.name || "Untitled Workflow");
      setIsWorkflowNameDirty(false);
      setLastPersistedSnapshot(
        createSnapshot(
          loaded.name || "Untitled Workflow",
          loaded.nodes,
          loaded.edges
        )
      );
      setViewportCache((prev) =>
        prev[workflowId]
          ? prev
          : {
              ...prev,
              [workflowId]: DEFAULT_VIEWPORT,
            }
      );
    },
    [hasUnsavedChanges, loadWorkflow, workflow?.id]
  );

  const handleCreateNewWorkflow = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Discard current changes and start a new workflow?"
      );
      if (!confirmed) {
        return;
      }
    }
    reset();
    setWorkflowName("My Workflow");
    setIsWorkflowNameDirty(false);
    setSelectedHistoryId(null);
    setLastPersistedSnapshot(createSnapshot("My Workflow", [], []));
    setViewportCache((prev) => ({
      ...prev,
      [DRAFT_WORKFLOW_ID]: DEFAULT_VIEWPORT,
    }));
  }, [hasUnsavedChanges, reset]);

  const handleViewExecutionResult = useCallback(
    async (executionId: string) => {
      try {
        await pollExecution(executionId);
        setShowExecutionResult(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load execution";
        alert(errorMessage);
      }
    },
    [pollExecution]
  );

  const historyPlaceholder = (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
      <p className="font-medium text-gray-900">No saved workflows yet</p>
      <p className="mt-1">
        Save your first workflow to see it appear in the history panel.
      </p>
      <Button className="mt-4" onClick={handleCreateNewWorkflow}>
        Create Workflow
      </Button>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100">
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
              Build, save, and rerun workflows with Temporal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => handleWorkflowNameChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-gray-900 bg-white"
            placeholder="Workflow name"
          />
          {hasUnsavedChanges && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              Unsaved changes
            </span>
          )}
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
                {validationErrors.map((validationError, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span>{validationError}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 bg-white/90 backdrop-blur-sm border-r border-gray-200/80 p-6 overflow-y-auto shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Workflow History
              </h2>
              <p className="text-sm text-gray-500">
                {historyTotal} saved workflows
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateNewWorkflow}
              >
                New
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchHistory({ offset: 0, append: false })}
              >
                Refresh
              </Button>
            </div>
          </div>

          {historyError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">Failed to load history</p>
              <p className="mt-1">{historyError}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  fetchHistory({ offset: historyOffset, append: false })
                }
              >
                Retry
              </Button>
            </div>
          )}

          {!isHistoryLoading && historyItems.length === 0 && historyPlaceholder}

          <ul className="flex-1 overflow-y-auto divide-y divide-gray-200">
            {historyItems.map((item) => {
              const lastExecution = item.lastExecution;
              return (
                <li
                  key={item.id}
                  className={`p-4 transition-colors ${
                    selectedHistoryId === item.id
                      ? "bg-blue-50/70 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.name || "Untitled Workflow"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated {formatRelativeTime(item.updatedAt)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <p>{item.nodeCount} nodes</p>
                      <p>{item.edgeCount} edges</p>
                    </div>
                  </div>

                  {lastExecution && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                          statusClassMap[lastExecution.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {lastExecution.status}
                      </span>
                      {lastExecution.finishedAt && (
                        <span className="text-gray-500">
                          Finished{" "}
                          {formatRelativeTime(lastExecution.finishedAt)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditWorkflow(item.id)}
                      disabled={isLoading && workflow?.id === item.id}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunWorkflowFromHistory(item.id)}
                      disabled={status === "running"}
                    >
                      {status === "running" && selectedHistoryId === item.id
                        ? "Running..."
                        : "Run"}
                    </Button>
                    {lastExecution && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleViewExecutionResult(lastExecution.id)
                        }
                      >
                        View Result
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {isHistoryLoading && historyItems.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Loading workflows...
            </div>
          )}

          {hasMoreHistory && (
            <Button
              onClick={() =>
                fetchHistory({ offset: historyItems.length, append: true })
              }
              disabled={isHistoryLoadingMore}
            >
              {isHistoryLoadingMore ? "Loading..." : "Load more"}
            </Button>
          )}
        </aside>

        <div className="flex flex-1 overflow-hidden">
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
              {["start", "http", "output"].map((nodeType) => {
                const config = {
                  start: {
                    label: "Start Node",
                    classes:
                      "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
                  },
                  http: {
                    label: "HTTP Node",
                    classes:
                      "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
                  },
                  output: {
                    label: "Output Node",
                    classes:
                      "from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700",
                  },
                } as const;
                const { label, classes } =
                  config[nodeType as "start" | "http" | "output"];
                return (
                  <button
                    key={nodeType}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", nodeType);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() =>
                      handleAddNode(nodeType as "start" | "http" | "output")
                    }
                    className={`w-full px-4 py-3 bg-gradient-to-r ${classes} text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium group cursor-grab active:cursor-grabbing`}
                  >
                    {label}
                  </button>
                );
              })}
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

          <main className="flex-1 relative">
            <ReactFlowProvider>
              <FlowCanvas
                key={workflow?.id || "new"}
                nodes={nodes || []}
                edges={edges || []}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onAddNode={handleAddNode}
                viewport={activeViewport}
                onViewportChange={handleViewportChange}
              />
            </ReactFlowProvider>
          </main>
        </div>
      </div>

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

      {showExecutionResult && execution && (
        <ExecutionResult
          execution={execution}
          onClose={() => {
            setShowExecutionResult(false);
            clearExecution();
          }}
        />
      )}

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
                Nodes:{" "}
                <span className="text-gray-900">{nodes?.length ?? 0}</span>
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
                Edges:{" "}
                <span className="text-gray-900">{edges?.length ?? 0}</span>
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
