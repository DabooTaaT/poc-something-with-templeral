"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { HttpNodeData } from "@/lib/types/dag";

export function HttpNode({ data, selected }: NodeProps<HttpNodeData>) {
  const truncatedUrl =
    data.url.length > 30
      ? `${data.url.substring(0, 30)}...`
      : data.url || "No URL";

  return (
    <div
      className={`px-4 py-3 bg-blue-500 rounded-lg shadow-md border-2 min-w-[180px] ${
        selected ? "border-blue-700 ring-2 ring-blue-300" : "border-blue-600"
      }`}
    >
      <div className="text-white font-semibold text-xs mb-1">
        {data.method || "GET"}
      </div>
      <div className="text-white text-xs truncate" title={data.url}>
        {truncatedUrl}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-white border-2 border-blue-600"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-white border-2 border-blue-600"
      />
    </div>
  );
}
