"use client";

import { useEffect } from "react";
import type { ReactFlowInstance } from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface UseKeyboardShortcutsOptions {
  flow: ReactFlowInstance<CanvasNode, CanvasEdge>;
  undo: () => void;
  redo: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"));
}

function isDialogOpen(): boolean {
  return document.querySelector('[data-slot="dialog-content"][data-open]') !== null;
}

export function useKeyboardShortcuts({ flow, undo, redo }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || isEditableTarget(event.target) || isDialogOpen()) return;

      const commandPressed = event.metaKey || event.ctrlKey;
      if (commandPressed && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (commandPressed && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (commandPressed) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        void flow.zoomIn({ duration: 180 });
      } else if (event.key === "-") {
        event.preventDefault();
        void flow.zoomOut({ duration: 180 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flow, redo, undo]);
}
