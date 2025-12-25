import { Workflow, Node, Edge, isHttpNode } from '../types/dag';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a workflow DAG
 */
export function validateDAG(workflow: Workflow): ValidationResult {
  const errors: string[] = [];

  // Check for at least one start node
  const startNodes = workflow.nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Workflow must have at least one start node');
  }

  // Check that start nodes have no incoming edges
  startNodes.forEach(node => {
    if (hasIncomingEdge(node.id, workflow.edges)) {
      errors.push(`Start node '${node.id}' cannot have incoming edges`);
    }
  });

  // Check for at least one output node
  const outputNodes = workflow.nodes.filter(n => n.type === 'output');
  if (outputNodes.length === 0) {
    errors.push('Workflow must have at least one output node');
  }

  // Check for cycles
  if (hasCycle(workflow.nodes, workflow.edges)) {
    errors.push('Workflow contains a cycle');
  }

  // Check connectivity from start to output
  startNodes.forEach(startNode => {
    const hasPath = outputNodes.some(outputNode =>
      findPath(startNode.id, outputNode.id, workflow.edges)
    );
    if (!hasPath) {
      errors.push(`Start node '${startNode.id}' has no path to any output node`);
    }
  });

  // Validate individual nodes
  workflow.nodes.forEach(node => {
    const nodeErrors = validateNode(node);
    errors.push(...nodeErrors);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an individual node
 */
function validateNode(node: Node): string[] {
  const errors: string[] = [];

  if (isHttpNode(node)) {
    if (!node.data.url || node.data.url.trim() === '') {
      errors.push(`HTTP node '${node.id}' must have a URL`);
    }

    if (!node.data.method) {
      // Default to GET
      node.data.method = 'GET';
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(node.data.method)) {
      errors.push(`HTTP node '${node.id}' has invalid method '${node.data.method}'`);
    }

    // Basic URL validation
    if (node.data.url && !isValidUrl(node.data.url)) {
      errors.push(`HTTP node '${node.id}' has invalid URL format`);
    }
  }

  return errors;
}

/**
 * Checks if a node has incoming edges
 */
function hasIncomingEdge(nodeId: string, edges: Edge[]): boolean {
  return edges.some(edge => edge.target === nodeId);
}

/**
 * Detects cycles in the DAG using DFS
 */
function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) {
          return true;
        }
      } else if (recStack.has(edge.target)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds if there's a path from source to target using BFS
 */
function findPath(sourceId: string, targetId: string, edges: Edge[]): boolean {
  if (sourceId === targetId) return true;

  const queue: string[] = [sourceId];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    const neighbors = edges
      .filter(e => e.source === current)
      .map(e => e.target);

    for (const neighbor of neighbors) {
      if (neighbor === targetId) {
        return true;
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Basic URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

