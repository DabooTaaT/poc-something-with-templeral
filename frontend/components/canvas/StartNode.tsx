"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { StartNodeData } from "@/lib/types/dag";

export function StartNode({ data }: NodeProps<StartNodeData>) {
  return (
    <div className="px-4 py-3 bg-green-500 rounded-lg shadow-md border-2 border-green-600 min-w-[120px] text-center">
      <div className="text-white font-semibold text-sm">
        {data.label || "Start"}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-white border-2 border-green-600"
      />
    </div>
  );
}
