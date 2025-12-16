"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { HttpNodeData } from "@/lib/types/dag";

const methodColors: Record<string, string> = {
  GET: "from-blue-500 to-blue-600",
  POST: "from-green-500 to-green-600",
  PUT: "from-yellow-500 to-yellow-600",
  DELETE: "from-red-500 to-red-600",
  PATCH: "from-purple-500 to-purple-600",
};

export function HttpNode({ data, selected }: NodeProps<HttpNodeData>) {
  const method = data.method || "GET";
  const truncatedUrl =
    data.url.length > 35
      ? `${data.url.substring(0, 35)}...`
      : data.url || "No URL";

  return (
    <div
      className={`px-5 py-4 bg-gradient-to-br ${
        methodColors[method] || methodColors.GET
      } rounded-xl shadow-lg border-2 min-w-[200px] transition-[opacity,transform,shadow,border-color] duration-150 ${
        selected
          ? "border-blue-700 ring-4 ring-blue-300/50 shadow-xl scale-105"
          : "border-blue-600/80 hover:shadow-xl hover:scale-[1.02]"
      }`}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-white/90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <div className="text-white font-bold text-xs px-2 py-0.5 bg-white/20 rounded-md backdrop-blur-sm">
          {method}
        </div>
      </div>
      <div className="text-white text-xs truncate font-medium" title={data.url}>
        {truncatedUrl}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-white border-3 border-blue-600 shadow-md hover:bg-blue-50 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-white border-3 border-blue-600 shadow-md hover:bg-blue-50 transition-colors"
      />
    </div>
  );
}
