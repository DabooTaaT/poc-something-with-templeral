import { useState, useCallback, useEffect, useMemo } from "react";
import type { Viewport } from "reactflow";
import { Node, Edge, WorkflowSummary } from "@/lib/types/dag";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmationDialog";
import { createSnapshot, formatRelativeTime } from "./utils";
import { DRAFT_WORKFLOW_ID, DEFAULT_VIEWPORT } from "./constant";

interface UseHomeControllerProps {
  workflow: { id?: string; name?: string } | null;
  nodes: Node[] | null;
  edges: Edge[] | null;
  isLoading: boolean;
  isViewMode: boolean;
  currentVersion: number;
  viewingVersion: number | null | undefined;
  saveWorkflow: (name: string) => Promise<string>;
  addNode: (
    type: "start" | "http" | "code" | "output",
    position: { x: number; y: number }
  ) => void;
  updateNode: (id: string, updates: { data: Node["data"] }) => void;
  deleteNode: (id: string) => void;
  validate: () => { valid: boolean; errors: string[] };
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadWorkflow: (id: string) => Promise<{ name?: string; nodes: Node[]; edges: Edge[] } | null>;
  reset: () => void;
  runWorkflow: (id: string) => Promise<void>;
  status: string;
  loadVersions: (id: string) => Promise<unknown>;
  restoreVersion: (id: string, versionNumber: number) => Promise<unknown>;
  viewVersion: (id: string, versionNumber: number) => Promise<void>;
  backToCurrentVersion: () => void;
  pollExecution: (id: string) => Promise<void>;
  clearExecution: () => void;
}

export function useHomeController({
  workflow,
  nodes,
  edges,
  isLoading,
  isViewMode,
  currentVersion,
  viewingVersion,
  saveWorkflow,
  addNode,
  updateNode,
  deleteNode,
  validate,
  setNodes,
  setEdges,
  loadWorkflow,
  reset,
  runWorkflow,
  status,
  loadVersions,
  restoreVersion,
  viewVersion,
  backToCurrentVersion,
  pollExecution,
  clearExecution,
}: UseHomeControllerProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const { showConfirm } = useConfirm();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showExecutionResult, setShowExecutionResult] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [isWorkflowNameDirty, setIsWorkflowNameDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<WorkflowSummary[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [viewportCache, setViewportCache] = useState<Record<string, Viewport>>({
    [DRAFT_WORKFLOW_ID]: DEFAULT_VIEWPORT,
  });
  const [lastPersistedSnapshot, setLastPersistedSnapshot] = useState<string>(
    () => createSnapshot("My Workflow", [], [])
  );

  const workflowKey = workflow?.id ?? DRAFT_WORKFLOW_ID;
  const activeViewport = viewportCache[workflowKey];
  const currentSnapshot = useMemo(
    () => createSnapshot(workflowName, nodes || [], edges || []),
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
      type: "start" | "http" | "code" | "output",
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
    if (isViewMode) {
      showWarning(
        "You are viewing a previous version. Please switch back to current version to save changes."
      );
      return;
    }

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
      showSuccess("Workflow saved successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to save workflow: ${errorMessage}`);
    }
  }, [
    currentSnapshot,
    fetchHistory,
    saveWorkflow,
    validate,
    workflowName,
    isViewMode,
    showSuccess,
    showError,
    showWarning,
  ]);

  const handleRunWorkflow = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      showError(`Validation failed: ${validation.errors.join(", ")}`);
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
      showError(`Failed to save workflow: ${errorMessage}`);
      return;
    }

    try {
      await runWorkflow(workflowId);
      setShowExecutionResult(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to run workflow: ${errorMessage}`);
    }
  }, [currentSnapshot, runWorkflow, saveWorkflow, validate, workflowName, showError]);

  const handleRunWorkflowFromHistory = useCallback(
    async (workflowId: string) => {
      try {
        await runWorkflow(workflowId);
        setSelectedHistoryId(workflowId);
        setShowExecutionResult(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        showError(`Failed to run workflow: ${errorMessage}`);
      }
    },
    [runWorkflow, showError]
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

  const proceedWithEditWorkflow = useCallback(
    async (workflowId: string) => {
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
    [loadWorkflow]
  );

  const handleEditWorkflow = useCallback(
    async (workflowId: string) => {
      if (workflowId === workflow?.id) {
        return;
      }
      if (hasUnsavedChanges) {
        showConfirm({
          message: "You have unsaved changes. Continue without saving?",
          onConfirm: () => {
            proceedWithEditWorkflow(workflowId);
          },
        });
        return;
      }

      proceedWithEditWorkflow(workflowId);
    },
    [hasUnsavedChanges, workflow?.id, showConfirm, proceedWithEditWorkflow]
  );

  const createNewWorkflow = useCallback(() => {
    reset();
    setWorkflowName("My Workflow");
    setIsWorkflowNameDirty(false);
    setSelectedHistoryId(null);
    setLastPersistedSnapshot(createSnapshot("My Workflow", [], []));
    setViewportCache((prev) => ({
      ...prev,
      [DRAFT_WORKFLOW_ID]: DEFAULT_VIEWPORT,
    }));
  }, [reset]);

  const handleCreateNewWorkflow = useCallback(() => {
    if (hasUnsavedChanges) {
      showConfirm({
        message: "Discard current changes and start a new workflow?",
        onConfirm: createNewWorkflow,
      });
      return;
    }
    createNewWorkflow();
  }, [hasUnsavedChanges, showConfirm, createNewWorkflow]);

  const handleViewExecutionResult = useCallback(
    async (executionId: string) => {
      try {
        await pollExecution(executionId);
        setShowExecutionResult(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load execution";
        showError(errorMessage);
      }
    },
    [pollExecution, showError]
  );

  const handleRefreshVersions = useCallback(async () => {
    if (workflow?.id) {
      await loadVersions(workflow.id);
    }
  }, [workflow?.id, loadVersions]);

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      if (!workflow?.id) return;
      await restoreVersion(workflow.id, versionNumber);
      setLastPersistedSnapshot(createSnapshot(workflowName, nodes || [], edges || []));
      setIsWorkflowNameDirty(false);
    },
    [workflow?.id, restoreVersion, workflowName, nodes, edges]
  );

  const handleViewVersion = useCallback(
    async (versionNumber: number) => {
      if (!workflow?.id) return;
      try {
        await viewVersion(workflow.id, versionNumber);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        showError(`Failed to view version: ${errorMessage}`);
      }
    },
    [workflow?.id, viewVersion, showError]
  );

  return {
    // State
    selectedNode,
    setSelectedNode,
    showConfigPanel,
    setShowConfigPanel,
    showExecutionResult,
    setShowExecutionResult,
    showVersionHistory,
    setShowVersionHistory,
    workflowName,
    validationErrors,
    historyItems,
    historyTotal,
    isHistoryLoading,
    isHistoryLoadingMore,
    historyError,
    selectedHistoryId,
    activeViewport,
    hasUnsavedChanges,
    hasMoreHistory,
    historyOffset,
    // Handlers
    handleAddNode,
    handleNodeClick,
    handleNodeDoubleClick,
    handleSaveNodeConfig,
    handleDeleteSelected,
    handleWorkflowNameChange,
    handleSaveWorkflow,
    handleRunWorkflow,
    handleRunWorkflowFromHistory,
    handleViewportChange,
    handleEditWorkflow,
    handleCreateNewWorkflow,
    handleViewExecutionResult,
    handleRefreshVersions,
    handleRestoreVersion,
    handleViewVersion,
    fetchHistory,
    formatRelativeTime,
  };
}

