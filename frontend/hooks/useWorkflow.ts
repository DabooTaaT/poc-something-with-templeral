import { useState, useCallback } from 'react';
import { Workflow, Node, Edge } from '@/lib/types/dag';
import { validateDAG } from '@/lib/dag/validation';
import { apiClient } from '@/lib/api/client';

export function useWorkflow() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const wf = await apiClient.getWorkflow(id);
      setWorkflow(wf);
      setNodes(wf.nodes);
      setEdges(wf.edges);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow';
      setError(errorMessage);
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
        nodes,
        edges,
      };

      // Validate before saving
      const validation = validateDAG(wf);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (workflow?.id) {
        // Update existing
        await apiClient.updateWorkflow(workflow.id, wf);
        return workflow.id;
      } else {
        // Create new
        const result = await apiClient.createWorkflow(wf);
        setWorkflow({ ...wf, id: result.id });
        return result.id;
      }
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
    setNodes(prev => [...prev, newNode]);
  }, []);

  const updateNode = useCallback((id: string, data: Partial<Node>) => {
    setNodes(prev => prev.map(node => 
      node.id === id ? { ...node, ...data } : node
    ));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(node => node.id !== id));
    setEdges(prev => prev.filter(edge => edge.source !== id && edge.target !== id));
  }, []);

  const addEdge = useCallback((source: string, target: string) => {
    const newEdge: Edge = {
      id: `${source}-${target}`,
      source,
      target,
    };
    setEdges(prev => [...prev, newEdge]);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== id));
  }, []);

  const validate = useCallback(() => {
    const wf: Workflow = { name: workflow?.name || 'Untitled', nodes, edges };
    return validateDAG(wf);
  }, [nodes, edges, workflow]);

  const reset = useCallback(() => {
    setWorkflow(null);
    setNodes([]);
    setEdges([]);
    setError(null);
  }, []);

  return {
    workflow,
    nodes,
    edges,
    isLoading,
    error,
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
  };
}

