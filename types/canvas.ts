import type { Edge, Node } from "@xyflow/react";

export const NODE_COLORS = [
  { color: "#1F1F1F", textColor: "#EDEDED" },
  { color: "#10233D", textColor: "#52A8FF" },
  { color: "#2E1938", textColor: "#BF7AF0" },
  { color: "#331B00", textColor: "#FF990A" },
  { color: "#3C1618", textColor: "#FF6166" },
  { color: "#3A1726", textColor: "#F75F8F" },
  { color: "#0F2E18", textColor: "#62C073" },
  { color: "#062822", textColor: "#0AC7B4" },
] as const;

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const;

export type NodeShape = (typeof NODE_SHAPES)[number];
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: (typeof NODE_COLORS)[number]["color"];
  textColor?: (typeof NODE_COLORS)[number]["textColor"];
  shape: NodeShape;
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;
export interface CanvasEdgeData extends Record<string, unknown> {
  label?: string;
}

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">;

export interface CanvasPresence {
  cursor: { x: number; y: number } | null;
  isThinking: boolean;
}
