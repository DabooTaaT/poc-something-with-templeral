"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { StartNodeData } from "@/lib/types/dag";

export function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  return (
    <div
      className={`px-5 py-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg border-2 min-w-[140px] transition-[opacity,transform,shadow,border-color] duration-150 ${
        selected
          ? "border-green-700 ring-4 ring-green-300/50 shadow-xl scale-105"
          : "border-green-600/80 hover:shadow-xl hover:scale-[1.02]"
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
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-white font-bold text-sm">
          {data.label || "Start"}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-white border-3 border-green-600 shadow-md hover:bg-green-50 transition-colors"
      />
    </div>
  );
}
