"use client"

import { X, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function EmptyProjectsState() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
      <p className="text-sm font-medium text-copy-secondary">No projects yet</p>
      <p className="mt-1 text-xs text-copy-muted">
        Your projects will appear here.
      </p>
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="Projects sidebar"
      className={`fixed bottom-4 left-4 top-[4.5rem] z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl backdrop-blur transition-[transform,opacity] duration-200 ease-out ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0"
      }`}
      inert={!isOpen}
    >
      <div className="flex h-14 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          aria-label="Close projects sidebar"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col p-4">
        <TabsList className="w-full bg-subtle">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="my-projects" className="mt-3 flex-1">
          <EmptyProjectsState />
        </TabsContent>
        <TabsContent value="shared" className="mt-3 flex-1">
          <EmptyProjectsState />
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-4">
        <Button className="w-full">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
