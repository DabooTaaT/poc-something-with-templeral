import { useState, useCallback } from 'react';
import { Workflow, Node, Edge, WorkflowVersion } from '@/lib/types/dag';
import { validateDAG } from '@/lib/dag/validation';
import { apiClient } from '@/lib/api/client';

export function useWorkflow() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const loadWorkflow = useCallback(async (id: string): Promise<Workflow | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const wf = await apiClient.getWorkflow(id);
      
      // Handle both formats: parsed (nodes/edges) or raw (dag_json string)
      let nodes: Node[] = [];
      let edges: Edge[] = [];
      
      if (Array.isArray(wf.nodes) && Array.isArray(wf.edges)) {
        // Already parsed format
        nodes = wf.nodes;
        edges = wf.edges;
      } else if (typeof (wf as any).dag_json === 'string') {
        // Raw format - parse dag_json
        try {
          const dagStruct = JSON.parse((wf as any).dag_json);
          nodes = Array.isArray(dagStruct.nodes) ? dagStruct.nodes : [];
          edges = Array.isArray(dagStruct.edges) ? dagStruct.edges : [];
        } catch (parseErr) {
          console.error('Failed to parse dag_json:', parseErr);
          setError('Failed to parse workflow data');
          return null;
        }
      }
      
      // Create workflow object with parsed nodes/edges
      const parsedWf: Workflow = {
        id: wf.id,
        name: wf.name,
        version: wf.version,
        nodes,
        edges,
        createdAt: wf.createdAt,
        updatedAt: wf.updatedAt,
      };
      
      setWorkflow(parsedWf);
      setNodes(nodes);
      setEdges(edges);
      if (wf.version !== undefined) {
        setCurrentVersion(wf.version);
      }
      return parsedWf;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveWorkflow = useCallback(async (name: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const wf: Workflow = {
        name,
        nodes: Array.isArray(nodes) ? nodes : [],
        edges: Array.isArray(edges) ? edges : [],
      };

      // Validate before saving
      const validation = validateDAG(wf);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (workflow?.id) {
        // Update existing
        const updated = await apiClient.updateWorkflow(workflow.id, wf);
        setWorkflow(updated);
        setNodes(Array.isArray(updated.nodes) ? updated.nodes : []);
        setEdges(Array.isArray(updated.edges) ? updated.edges : []);
        if (updated.version !== undefined) {
          setCurrentVersion(updated.version);
        }
        // Refresh versions list after save
        if (workflow.id) {
          loadVersions(workflow.id);
        }
        return updated.id ?? workflow.id;
      }

      // Create new
      const created = await apiClient.createWorkflow(wf);
      setWorkflow(created);
      return created.id!;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workflow';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, workflow]);

  const addNode = useCallback((type: 'start' | 'http' | 'output', position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: type === 'http' ? { url: '', method: 'GET' } : { label: type },
    };
    setNodes(prev => Array.isArray(prev) ? [...prev, newNode] : [newNode]);
  }, []);

  const updateNode = useCallback((id: string, data: Partial<Node>) => {
    setNodes(prev => Array.isArray(prev) ? prev.map(node => 
      node.id === id ? { ...node, ...data } : node
    ) : []);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => Array.isArray(prev) ? prev.filter(node => node.id !== id) : []);
    setEdges(prev => Array.isArray(prev) ? prev.filter(edge => edge.source !== id && edge.target !== id) : []);
  }, []);

  const addEdge = useCallback((source: string, target: string) => {
    const newEdge: Edge = {
      id: `${source}-${target}`,
      source,
      target,
    };
    setEdges(prev => Array.isArray(prev) ? [...prev, newEdge] : [newEdge]);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges(prev => Array.isArray(prev) ? prev.filter(edge => edge.id !== id) : []);
  }, []);

  const validate = useCallback(() => {
    const wf: Workflow = { 
      name: workflow?.name || 'Untitled', 
      nodes: Array.isArray(nodes) ? nodes : [], 
      edges: Array.isArray(edges) ? edges : [] 
    };
    return validateDAG(wf);
  }, [nodes, edges, workflow]);

  const loadVersions = useCallback(async (workflowId: string): Promise<WorkflowVersion[]> => {
    setIsLoadingVersions(true);
    setError(null);
    try {
      const response = await apiClient.listWorkflowVersions(workflowId);
      setVersions(response.versions);
      setCurrentVersion(response.currentVersion);
      return response.versions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load versions';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  const loadVersion = useCallback(async (workflowId: string, versionNumber: number): Promise<WorkflowVersion | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const version = await apiClient.getWorkflowVersion(workflowId, versionNumber);
      return version;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load version';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (workflowId: string, versionNumber: number): Promise<Workflow | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const restored = await apiClient.restoreWorkflowVersion(workflowId, versionNumber);
      
      // Update workflow state with restored data
      const parsedWf: Workflow = {
        id: restored.id,
        name: restored.name,
        version: restored.version,
        nodes: Array.isArray(restored.nodes) ? restored.nodes : [],
        edges: Array.isArray(restored.edges) ? restored.edges : [],
        createdAt: restored.createdAt,
        updatedAt: restored.updatedAt,
      };
      
      setWorkflow(parsedWf);
      setNodes(parsedWf.nodes);
      setEdges(parsedWf.edges);
      if (restored.version !== undefined) {
        setCurrentVersion(restored.version);
      }
      
      // Refresh versions list
      await loadVersions(workflowId);
      
      return parsedWf;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadVersions]);

  const reset = useCallback(() => {
    setWorkflow(null);
    setNodes([]);
    setEdges([]);
    setError(null);
    setVersions([]);
    setCurrentVersion(0);
  }, []);

  return {
    workflow,
    nodes,
    edges,
    isLoading,
    error,
    versions,
    currentVersion,
    isLoadingVersions,
    loadWorkflow,
    saveWorkflow,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    validate,
    reset,
    setNodes,
    setEdges,
    loadVersions,
    loadVersion,
    restoreVersion,
  };
}

