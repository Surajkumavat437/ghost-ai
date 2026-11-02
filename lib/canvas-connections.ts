import { ConnectionMode, Position } from "@xyflow/react";

export const CANVAS_CONNECTION_MODE = ConnectionMode.Loose;

const SIDE_HANDLES = [
  {
    side: "top",
    position: Position.Top,
    sourceStyle: { left: "calc(50% + 7px)" },
    targetStyle: { left: "calc(50% - 7px)" },
  },
  {
    side: "right",
    position: Position.Right,
    sourceStyle: { top: "calc(50% + 7px)" },
    targetStyle: { top: "calc(50% - 7px)" },
  },
  {
    side: "bottom",
    position: Position.Bottom,
    sourceStyle: { left: "calc(50% - 7px)" },
    targetStyle: { left: "calc(50% + 7px)" },
  },
  {
    side: "left",
    position: Position.Left,
    sourceStyle: { top: "calc(50% - 7px)" },
    targetStyle: { top: "calc(50% + 7px)" },
  },
] as const;

export const CANVAS_NODE_HANDLES = SIDE_HANDLES.flatMap(({ side, position, sourceStyle, targetStyle }) => [
  { id: `${side}-target`, type: "target" as const, position, style: targetStyle },
  { id: `${side}-source`, type: "source" as const, position, style: sourceStyle },
]);
