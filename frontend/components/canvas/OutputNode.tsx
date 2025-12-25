"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { OutputNodeData } from "@/lib/types/dag";

export function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
  const hasResult = data.result !== undefined && data.result !== null;

  return (
    <div
      className={`px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 min-w-[160px] transition-all duration-200 group ${
        selected
          ? "ring-2 ring-orange-500 shadow-orange-100"
          : "hover:border-orange-300 hover:shadow-lg hover:shadow-orange-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-700 text-sm">Output</span>
        </div>
        {hasResult && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </div>

      <div
        className={`text-xs px-2 py-1 rounded ${
          hasResult
            ? "bg-green-50 text-green-700 border border-green-100"
            : "bg-gray-50 text-gray-400 border border-gray-100"
        }`}
      >
        {hasResult ? "✓ Result Ready" : "Waiting for result..."}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white shadow-sm hover:!bg-orange-600 hover:scale-125 transition-all"
      />
    </div>
  );
}
