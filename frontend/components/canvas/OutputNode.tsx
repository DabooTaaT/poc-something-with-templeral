"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { OutputNodeData } from "@/lib/types/dag";

export function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
  return (
    <div
      className={`px-5 py-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg border-2 min-w-[140px] transition-[opacity,transform,shadow,border-color] duration-150 ${
        selected
          ? "border-orange-700 ring-4 ring-orange-300/50 shadow-xl scale-105"
          : "border-orange-600/80 hover:shadow-xl hover:scale-[1.02]"
      }`}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center gap-2 justify-center">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div className="text-white font-bold text-sm">
          {data.label || "Output"}
        </div>
      </div>
      {data.result !== undefined && data.result !== null && (
        <div className="mt-2 text-xs text-orange-100 bg-white/10 rounded px-2 py-1 text-center backdrop-blur-sm">
          ✓ Result available
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-white border-3 border-orange-600 shadow-md hover:bg-orange-50 transition-colors"
      />
    </div>
  );
}
