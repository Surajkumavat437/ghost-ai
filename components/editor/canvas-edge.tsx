"use client";

import { createContext, useCallback, useContext, useState, type KeyboardEvent } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

import type { CanvasEdge } from "@/types/canvas";

export const UpdateCanvasEdgeLabelContext = createContext<((id: string, label: string) => void) | null>(null);

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<CanvasEdge>) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");
  const updateLabel = useContext(UpdateCanvasEdgeLabelContext);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const active = hovered || selected;
  const savedLabel = data?.label ?? "";

  const beginEditing = useCallback(() => {
    setDraft(savedLabel);
    setEditing(true);
  }, [savedLabel]);
  const commit = useCallback(() => {
    updateLabel?.(id, draft.trim());
    setEditing(false);
  }, [draft, id, updateLabel]);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      commit();
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={0}
        style={{
          stroke: "var(--text-primary)",
          strokeWidth: 1.75,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: active ? 1 : 0.68,
          transition: "opacity 120ms ease",
        }}
      />
      <path
        d={edgePath}
        className="react-flow__edge-interaction"
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        pointerEvents="stroke"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          beginEditing();
        }}
      />
      {(savedLabel || active || editing) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              beginEditing();
            }}
          >
            {editing ? (
              <input
                autoFocus
                aria-label="Edit edge label"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={onKeyDown}
                onKeyUp={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                style={{ width: `${Math.max(4, draft.length + 1)}ch` }}
                className="nodrag nopan min-w-16 max-w-52 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-center text-xs text-copy-primary outline-none focus:border-brand"
              />
            ) : savedLabel ? (
              <button
                type="button"
                aria-label={`Edge label: ${savedLabel}. Double-click to edit`}
                onClick={(event) => event.stopPropagation()}
                className="nodrag nopan max-w-52 truncate rounded-full border border-surface-border bg-surface px-2.5 py-1 text-xs text-copy-secondary shadow-sm"
              >
                {savedLabel}
              </button>
            ) : (
              <button
                type="button"
                aria-label="Add edge label"
                onClick={(event) => {
                  event.stopPropagation();
                  beginEditing();
                }}
                className="nodrag nopan rounded-full border border-surface-border/70 bg-surface/80 px-2.5 py-1 text-xs text-copy-faint"
              >
                Double-click to label
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
