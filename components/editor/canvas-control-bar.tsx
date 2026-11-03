"use client";

import { AlertCircle, Check, LoaderCircle, Maximize, Redo2, Save, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import type { ReactFlowInstance } from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-save";

interface CanvasControlBarProps {
  flow: ReactFlowInstance<CanvasNode, CanvasEdge>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveStatus: CanvasSaveStatus;
  onSave: () => void;
  canSave: boolean;
  loadFailed: boolean;
}

const iconButtonClass = "flex size-8 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-copy-secondary";

export function CanvasControlBar({ flow, canUndo, canRedo, undo, redo, saveStatus, onSave, canSave, loadFailed }: CanvasControlBarProps) {
  const saveLabel = loadFailed ? "Canvas could not load" : saveStatus === "saving" ? "Saving canvas" : saveStatus === "error" ? "Canvas save failed; retry" : !canSave ? "Make a canvas change to enable saving" : saveStatus === "saved" ? "Canvas saved" : "Save canvas";
  return (
    <div aria-label="Canvas controls" className="absolute bottom-20 left-4 z-20 flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-xl shadow-base/50 backdrop-blur min-[44rem]:bottom-5">
      <div role="group" aria-label="Zoom controls" className="flex items-center gap-0.5">
        <button type="button" aria-label="Zoom out" title="Zoom out" className={iconButtonClass} onClick={() => void flow.zoomOut({ duration: 180 })}>
          <ZoomOut className="size-4" />
        </button>
        <button type="button" aria-label="Fit canvas to view" title="Fit view" className={iconButtonClass} onClick={() => void flow.fitView({ duration: 180 })}>
          <Maximize className="size-4" />
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" className={iconButtonClass} onClick={() => void flow.zoomIn({ duration: 180 })}>
          <ZoomIn className="size-4" />
        </button>
      </div>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-surface-border" />
      <div role="group" aria-label="History controls" className="flex items-center gap-0.5">
        <button type="button" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" className={iconButtonClass} onClick={undo} disabled={!canUndo}>
          <Undo2 className="size-4" />
        </button>
        <button type="button" aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" className={iconButtonClass} onClick={redo} disabled={!canRedo}>
          <Redo2 className="size-4" />
        </button>
      </div>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-surface-border" />
      <button type="button" aria-label={saveLabel} title={saveLabel} onClick={onSave} disabled={!canSave || saveStatus === "saving"} className={`${iconButtonClass} gap-1 px-2 text-[10px] disabled:cursor-default`}>
        {loadFailed || saveStatus === "error" ? <AlertCircle className="size-4 text-state-error" /> : saveStatus === "saving" ? <LoaderCircle className="size-4 animate-spin" /> : saveStatus === "saved" ? <Check className="size-4 text-state-success" /> : <Save className="size-4" />}
        <span>{loadFailed ? "Load error" : saveStatus === "saving" ? "Saving" : saveStatus === "error" ? "Retry" : !canSave ? "No changes" : saveStatus === "saved" ? "Saved" : "Save"}</span>
      </button>
    </div>
  );
}
