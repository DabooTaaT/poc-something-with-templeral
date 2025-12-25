import { NodeTypes } from "reactflow";
import { StartNode, HttpNode, CodeNode, OutputNode } from "../CustomNodes";

export const NODE_TYPES: NodeTypes = {
  start: StartNode,
  http: HttpNode,
  code: CodeNode,
  output: OutputNode,
};


