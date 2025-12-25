"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { CodeNodeData } from "@/lib/types/dag";

export function CodeNode({ data, selected }: NodeProps<CodeNodeData>) {
  const hasCode = data.code && data.code.trim().length > 0;
  const codeSnippet = hasCode
    ? data.code?.split("\n").slice(0, 3).join("\n")
    : "// No code configured";

  return (
    <div
      className={`min-w-[240px] bg-[#1e1e1e] rounded-xl shadow-md border transition-all duration-200 group overflow-hidden ${
        selected
          ? "border-purple-500 ring-2 ring-purple-500/20 shadow-xl"
          : "border-gray-800 hover:border-purple-500/50 hover:shadow-lg"
      }`}
    >
      {/* Header */}
      <div className="bg-[#2d2d2d] px-3 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="text-purple-400">
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
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="text-gray-300 text-xs font-semibold tracking-wide">
            JS Code
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-3 font-mono text-[10px] leading-relaxed text-gray-400">
        <pre className="overflow-hidden opacity-80">
          {codeSnippet}
          {hasCode && data.code!.split("\n").length > 3 && "..."}
        </pre>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-[#1e1e1e] shadow-sm hover:!bg-purple-500 hover:scale-125 transition-all"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-[#1e1e1e] shadow-sm hover:!bg-purple-500 hover:scale-125 transition-all"
      />
    </div>
  );
}
