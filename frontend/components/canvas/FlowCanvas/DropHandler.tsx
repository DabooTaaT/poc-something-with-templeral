"use client";

import { FlowCanvasProps } from "./interface";
import { useDropHandler } from "./controller";

export function DropHandler({
  onAddNode,
}: {
  onAddNode?: FlowCanvasProps["onAddNode"];
}) {
  useDropHandler(onAddNode);
  return null;
}
