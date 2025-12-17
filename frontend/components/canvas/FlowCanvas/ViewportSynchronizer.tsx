"use client";

import { Viewport } from "reactflow";
import { useViewportSynchronizer } from "./controller";

export function ViewportSynchronizer({ viewport }: { viewport?: Viewport }) {
  useViewportSynchronizer(viewport);
  return null;
}
