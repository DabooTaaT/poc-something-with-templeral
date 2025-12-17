"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { StartNodeData } from "@/lib/types/dag";

export function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  return (
    <div
      className={`px-4 py-3 bg-white rounded-xl shadow-md border border-gray-200 min-w-[140px] transition-all duration-200 group ${
        selected
          ? "ring-2 ring-emerald-500 shadow-emerald-100"
          : "hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-emerald-200 shadow-sm text-white">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
        </div>
        <div className="font-semibold text-gray-800 text-sm">
          {data.label || "Start"}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white shadow-sm hover:!bg-emerald-600 hover:scale-125 transition-all"
      />
    </div>
  );
}
