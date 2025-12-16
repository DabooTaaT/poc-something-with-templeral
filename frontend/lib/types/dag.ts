// Position interface for node placement on canvas
export interface Position {
  x: number;
  y: number;
}

// Node data types for different node kinds
export interface StartNodeData {
  label?: string;
}

export interface HttpNodeData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}

export interface OutputNodeData {
  label?: string;
  result?: unknown; // Execution result if available
}

export type NodeData = StartNodeData | HttpNodeData | OutputNodeData;

// Node types
export type NodeType = 'start' | 'http' | 'output';

// Node interface
export interface Node {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

// Edge interface
export interface Edge {
  id: string;
  source: string;
  target: string;
}

// Workflow interface
export interface Workflow {
  id?: string;
  name: string;
  version?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt?: string;
  updatedAt?: string;
}

// Execution interface
export interface Execution {
  id: string;
  workflow_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: unknown;
  result_json?: string; // JSON string from backend
  error?: string;
  started_at: string;
  finished_at?: string;
}

// Type guards
export function isStartNode(node: Node): node is Node & { data: StartNodeData } {
  return node.type === 'start';
}

export function isHttpNode(node: Node): node is Node & { data: HttpNodeData } {
  return node.type === 'http';
}

export function isOutputNode(node: Node): node is Node & { data: OutputNodeData } {
  return node.type === 'output';
}

