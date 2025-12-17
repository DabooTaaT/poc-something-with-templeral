"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { HttpNodeData } from "@/lib/types/dag";
import { methodBadgeColors } from "./constant";

export function HttpNode({ data, selected }: NodeProps<HttpNodeData>) {
  const method = data.method || "GET";
  const url = data.url || "";
  const truncatedUrl =
    url && url.length > 30
      ? `${url.substring(0, 30)}...`
      : url || "No URL Configured";

  return (
    <div
      className={`relative min-w-[240px] bg-white rounded-xl shadow-md border transition-all duration-200 group ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xl"
          : "border-gray-200 hover:border-blue-300 hover:shadow-lg"
      }`}
    >
      {/* Header Line */}
      <div
        className={`h-1.5 w-full rounded-t-xl bg-gradient-to-r ${
          method === "GET"
            ? "from-blue-400 to-blue-600"
            : method === "POST"
            ? "from-green-400 to-green-600"
            : method === "DELETE"
            ? "from-red-400 to-red-600"
            : method === "PUT"
            ? "from-orange-400 to-orange-600"
            : "from-purple-400 to-purple-600"
        }`}
      />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                method === "GET"
                  ? "bg-blue-100 text-blue-600"
                  : method === "POST"
                  ? "bg-green-100 text-green-600"
                  : method === "DELETE"
                  ? "bg-red-100 text-red-600"
                  : method === "PUT"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-purple-100 text-purple-600"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">HTTP Request</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${methodBadgeColors[method]}`}
          >
            {method}
          </span>
        </div>

        <div
          className={`px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-2`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              url ? "bg-green-400" : "bg-gray-300"
            }`}
          />
          <span
            className={`text-xs font-mono truncate ${
              url ? "text-gray-600" : "text-gray-400 italic"
            }`}
            title={url}
          >
            {truncatedUrl}
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white shadow-sm hover:!bg-blue-500 hover:scale-125 transition-all"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white shadow-sm hover:!bg-blue-500 hover:scale-125 transition-all"
      />
    </div>
  );
}
