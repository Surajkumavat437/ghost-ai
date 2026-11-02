import { ConnectionMode, Position } from "@xyflow/react";

export const CANVAS_CONNECTION_MODE = ConnectionMode.Loose;

const SIDE_HANDLES = [
  {
    side: "top",
    position: Position.Top,
    sourceStyle: { left: "50%" },
    targetStyle: { left: "50%" },
  },
  {
    side: "right",
    position: Position.Right,
    sourceStyle: { top: "50%" },
    targetStyle: { top: "50%" },
  },
  {
    side: "bottom",
    position: Position.Bottom,
    sourceStyle: { left: "50%" },
    targetStyle: { left: "50%" },
  },
  {
    side: "left",
    position: Position.Left,
    sourceStyle: { top: "50%" },
    targetStyle: { top: "50%" },
  },
] as const;

export const CANVAS_NODE_HANDLES = SIDE_HANDLES.flatMap(({ side, position, sourceStyle, targetStyle }) => [
  { id: `${side}-target`, type: "target" as const, position, style: targetStyle },
  { id: `${side}-source`, type: "source" as const, position, style: sourceStyle },
]);
