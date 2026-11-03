"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-save";

interface WorkspaceSaveState {
  onSave: ((traceId?: string) => Promise<boolean>) | undefined;
  saveStatus: CanvasSaveStatus;
  saveError: string | null;
  setOnSave: (onSave: ((traceId?: string) => Promise<boolean>) | undefined) => void;
  setSaveStatus: (saveStatus: CanvasSaveStatus) => void;
  setSaveError: (saveError: string | null) => void;
}

const WorkspaceSaveContext = createContext<WorkspaceSaveState | null>(null);

export function WorkspaceSaveProvider({ children }: { children: ReactNode }) {
  const [onSave, setOnSave] = useState<((traceId?: string) => Promise<boolean>) | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const updateSaveAction = useCallback((action: ((traceId?: string) => Promise<boolean>) | undefined) => setOnSave(() => action), []);
  return <WorkspaceSaveContext.Provider value={{ onSave, saveStatus, saveError, setOnSave: updateSaveAction, setSaveStatus, setSaveError }}>{children}</WorkspaceSaveContext.Provider>;
}

export function useWorkspaceSave() {
  const context = useContext(WorkspaceSaveContext);
  if (!context) throw new Error("useWorkspaceSave must be used inside WorkspaceSaveProvider");
  return context;
}
