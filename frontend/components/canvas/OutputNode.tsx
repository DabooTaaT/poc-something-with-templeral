"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { OutputNodeData } from "@/lib/types/dag";

export function OutputNode({ data }: NodeProps<OutputNodeData>) {
  return (
    <div className="px-4 py-3 bg-orange-500 rounded-lg shadow-md border-2 border-orange-600 min-w-[120px] text-center">
      <div className="text-white font-semibold text-sm">
        {data.label || "Output"}
      </div>
      {data.result !== undefined && data.result !== null && (
        <div className="mt-2 text-xs text-orange-100">Result available</div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-white border-2 border-orange-600"
      />
    </div>
  );
}
