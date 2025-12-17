import type { Viewport } from "reactflow";

export const DEFAULT_HISTORY_LIMIT = 20;
export const DRAFT_WORKFLOW_ID = "__draft__";
export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const statusClassMap: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  RUNNING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

