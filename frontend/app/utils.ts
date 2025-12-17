import { Node, Edge } from "@/lib/types/dag";

export const createSnapshot = (name: string, nodes: Node[], edges: Edge[]) =>
  JSON.stringify({
    name,
    nodes,
    edges,
  });

export const formatRelativeTime = (timestamp?: string) => {
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

