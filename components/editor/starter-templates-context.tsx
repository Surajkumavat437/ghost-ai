"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import type { CanvasTemplate } from "@/components/editor/starter-templates";

interface StarterTemplatesContextValue {
  openStarterTemplates: () => void;
  pendingTemplate: CanvasTemplate | null;
  consumePendingTemplate: () => void;
}

const StarterTemplatesContext = createContext<StarterTemplatesContextValue | null>(null);

export function StarterTemplatesProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<CanvasTemplate | null>(null);
  const consumePendingTemplate = useCallback(() => setPendingTemplate(null), []);
  const value = useMemo(() => ({
    openStarterTemplates: () => setIsOpen(true),
    pendingTemplate,
    consumePendingTemplate,
  }), [pendingTemplate, consumePendingTemplate]);

  return (
    <StarterTemplatesContext.Provider value={value}>
      {children}
      <StarterTemplatesModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onImport={(template) => setPendingTemplate(template)}
      />
    </StarterTemplatesContext.Provider>
  );
}

export function useStarterTemplates() {
  const context = useContext(StarterTemplatesContext);
  if (!context) throw new Error("useStarterTemplates must be used within StarterTemplatesProvider");
  return context;
}
