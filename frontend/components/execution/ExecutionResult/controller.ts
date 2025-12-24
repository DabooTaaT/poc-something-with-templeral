import { Execution } from "@/lib/types/dag";

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-300";
    case "RUNNING":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-300";
    case "PENDING":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

export function formatDuration(execution: Execution): string {
  if (!execution.started_at || !execution.finished_at) return "N/A";
  const start = new Date(execution.started_at).getTime();
  const end = new Date(execution.finished_at).getTime();
  const duration = (end - start) / 1000;
  return `${duration.toFixed(2)}s`;
}


