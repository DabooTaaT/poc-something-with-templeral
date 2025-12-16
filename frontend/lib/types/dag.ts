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
  version?: number;
  nodes: Node[];
  edges: Edge[];
  createdAt?: string;
  updatedAt?: string;
}

// WorkflowVersion interface for version history
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  name: string;
  nodes?: Node[];
  edges?: Edge[];
  createdAt: string;
}

export interface WorkflowVersionListResponse {
  versions: WorkflowVersion[];
  total: number;
  currentVersion: number;
}

// Execution interface
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Execution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  result?: unknown;
  result_json?: string; // JSON string from backend
  error?: string;
  started_at: string;
  finished_at?: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
  lastExecution?: {
    id: string;
    status: ExecutionStatus;
    finishedAt?: string;
  };
}

export interface WorkflowListResponse {
  items: WorkflowSummary[];
  total: number;
  limit: number;
  offset: number;
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

