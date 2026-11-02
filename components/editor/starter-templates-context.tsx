"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import type { CanvasTemplate } from "@/components/editor/starter-templates";

interface StarterTemplatesContextValue {
  openStarterTemplates: () => void;
  pendingTemplates: QueuedCanvasTemplate[];
  enqueueTemplate: (template: CanvasTemplate) => void;
  acknowledgeTemplate: (requestId: string) => void;
}

export interface QueuedCanvasTemplate {
  id: string;
  template: CanvasTemplate;
}

const StarterTemplatesContext = createContext<StarterTemplatesContextValue | null>(null);

export function StarterTemplatesProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingTemplates, setPendingTemplates] = useState<QueuedCanvasTemplate[]>([]);
  const nextImportId = useRef(0);
  const enqueueTemplate = useCallback((template: CanvasTemplate) => {
    const id = `starter-template-${nextImportId.current++}`;
    setPendingTemplates((current) => [...current, { id, template }]);
  }, []);
  const acknowledgeTemplate = useCallback((requestId: string) => {
    setPendingTemplates((current) => current.filter((queued) => queued.id !== requestId));
  }, []);
  const value = useMemo(() => ({
    openStarterTemplates: () => setIsOpen(true),
    pendingTemplates,
    enqueueTemplate,
    acknowledgeTemplate,
  }), [pendingTemplates, enqueueTemplate, acknowledgeTemplate]);

  return (
    <StarterTemplatesContext.Provider value={value}>
      {children}
      <StarterTemplatesModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onImport={enqueueTemplate}
      />
    </StarterTemplatesContext.Provider>
  );
}

export function useStarterTemplates() {
  const context = useContext(StarterTemplatesContext);
  if (!context) throw new Error("useStarterTemplates must be used within StarterTemplatesProvider");
  return context;
}
